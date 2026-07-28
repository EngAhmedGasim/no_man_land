import os
import shutil
import argparse
from pathlib import Path
from urllib.parse import urlparse

try:
    from bs4 import BeautifulSoup
except Exception:
    BeautifulSoup = None

ROOT = Path('.')

IGNORE_SCHEMES = ("http", "https", "mailto", "tel")


def is_local_href(href: str) -> bool:
    if not href:
        return False
    href = href.strip()
    parsed = urlparse(href)
    if parsed.scheme and parsed.scheme.lower() in IGNORE_SCHEMES:
        return False
    if href.startswith('#'):
        return False
    return True


def html_files(root: Path):
    for p in root.rglob('*.html'):
        yield p


def plan_moves(root: Path):
    """Return mapping old_path -> new_path for pages to move.
    Move any *.html that is not named index.html into a directory of the same name with index.html inside.
    """
    mapping = {}
    for p in html_files(root):
        if p.name.lower() == 'index.html':
            continue
        # target dir: parent / stem
        target_dir = p.parent / p.stem
        target_file = target_dir / 'index.html'
        mapping[p] = target_file
    return mapping


def ensure_bs4():
    if BeautifulSoup is None:
        raise RuntimeError('BeautifulSoup4 is required. Install with: pip install beautifulsoup4')


def rewrite_links_in_soup(soup, src_path: Path, move_map: dict, root: Path):
    # Attributes to check
    attrs = ['href', 'src']
    changed = False

    for tag in soup.find_all(True):
        for a in attrs:
            if tag.has_attr(a):
                val = tag[a]
                if not is_local_href(val):
                    continue
                # If it's an absolute path starting with /, we'll keep it unchanged
                if val.startswith('/'):
                    continue
                # separate hash
                base, sep, hashfrag = val.partition('#')
                base, qsep, query = base.partition('?')

                if base.endswith('.html'):
                    # resolve target path from src_path.parent
                    target_candidate = (src_path.parent / base).resolve()
                    matched = None
                    for old, new in move_map.items():
                        try:
                            if old.resolve() == target_candidate:
                                matched = (old, new)
                                break
                        except Exception:
                            if str(old) == str((src_path.parent / base)):
                                matched = (old, new)
                                break

                    if matched:
                        old, new = matched
                        rel = os.path.relpath(new, start=src_path.parent)
                        # If rel points to index.html, shorten to directory form
                        if rel.endswith('index.html'):
                            rel = rel[:-len('index.html')]
                        if rel == '':
                            rel = '.'
                        newval = rel + (('?' + query) if query else '') + (('#' + hashfrag) if hashfrag else '')
                        tag[a] = newval
                        changed = True
                    else:
                        # convert index.html references to directory form where appropriate
                        if base.endswith('index.html'):
                            rel = os.path.relpath(src_path.parent / base, start=src_path.parent)
                            if rel.endswith('index.html'):
                                rel = rel[:-len('index.html')]
                            if rel == '':
                                rel = '.'
                            tag[a] = rel + (('#' + hashfrag) if hashfrag else '')
                            changed = True
                else:
                    # asset path may need adjustment if this page is moving
                    if src_path in move_map:
                        new_src = move_map[src_path]
                        # adjust only relative asset paths
                        if not (val.startswith('/') or urlparse(val).scheme):
                            asset_target = (src_path.parent / val).resolve()
                            rel = os.path.relpath(asset_target, start=new_src.parent)
                            tag[a] = rel
                            changed = True
    return changed


def run(dry_run=True, apply_moves=False):
    ensure_bs4()
    move_map = plan_moves(ROOT)

    print('Planned moves:')
    for old, new in move_map.items():
        print(f'  {old} -> {new}')

    modified = {}
    for p in list(html_files(ROOT)):
        with open(p, 'r', encoding='utf-8') as f:
            html = f.read()
        soup = BeautifulSoup(html, 'html.parser')
        changed = rewrite_links_in_soup(soup, p, move_map, ROOT)
        if changed:
            new_html = str(soup)
            modified[p] = new_html

    print('\nFiles that will be modified (links rewritten):')
    for p in modified:
        print(f'  {p}')

    if dry_run:
        print('\nDry run: no files will be written. Run with --apply to perform changes.')
        return move_map, modified

    backup_dir = ROOT / 'convert_site_backup'
    backup_dir.mkdir(exist_ok=True)

    for p in set(list(move_map.keys()) + list(modified.keys())):
        rel = p.relative_to(ROOT)
        dest = backup_dir / rel
        dest.parent.mkdir(parents=True, exist_ok=True)
        shutil.copy2(p, dest)

    for old, new_content in modified.items():
        target = move_map.get(old, old)
        target.parent.mkdir(parents=True, exist_ok=True)
        with open(target, 'w', encoding='utf-8') as f:
            f.write(new_content)
        print(f'Wrote updated file: {target}')

    for old, new in move_map.items():
        if old not in modified:
            new.parent.mkdir(parents=True, exist_ok=True)
            shutil.copy2(old, new)
            print(f'Copied: {old} -> {new}')

    for old in move_map.keys():
        try:
            os.remove(old)
            print(f'Removed original: {old}')
        except Exception as e:
            print(f'Could not remove {old}: {e}')

    print('\nDone. Backup of originals is in:', backup_dir)
    return move_map, modified


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description='Safely convert flat .html pages into folder/index.html layout and fix links.')
    parser.add_argument('--apply', action='store_true', help='Apply changes (perform moves and overwrite files). Otherwise run dry-run.')
    args = parser.parse_args()

    try:
        run(dry_run=not args.apply, apply_moves=args.apply)
    except Exception as e:
        print('Error:', e)
