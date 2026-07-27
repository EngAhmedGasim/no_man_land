/* القاسمي للمحاماة — سلوكيات الموقع المشتركة | shared site behaviours */
(function(){
  "use strict";

  /* ---------- Sticky header shadow ---------- */
  var header = document.querySelector(".site-header");
  if(header){
    var onScroll = function(){
      if(window.scrollY > 12){ header.classList.add("is-scrolled"); }
      else{ header.classList.remove("is-scrolled"); }
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive:true });
  }

  /* ---------- Mobile nav drawer ---------- */
  var toggle = document.querySelector(".nav-toggle");
  var drawer = document.querySelector(".mobile-nav");
  var scrim = document.querySelector(".nav-scrim");

  function closeDrawer(){
    if(!drawer) return;
    drawer.classList.remove("is-open");
    scrim.classList.remove("is-open");
    toggle.classList.remove("is-active");
    toggle.setAttribute("aria-expanded","false");
  }
  function openDrawer(){
    drawer.classList.add("is-open");
    scrim.classList.add("is-open");
    toggle.classList.add("is-active");
    toggle.setAttribute("aria-expanded","true");
  }
  if(toggle && drawer){
    toggle.addEventListener("click", function(){
      drawer.classList.contains("is-open") ? closeDrawer() : openDrawer();
    });
    scrim.addEventListener("click", closeDrawer);
    drawer.querySelectorAll("a").forEach(function(a){ a.addEventListener("click", closeDrawer); });
    document.addEventListener("keydown", function(e){ if(e.key === "Escape") closeDrawer(); });
  }

  /* ---------- Scroll reveal ---------- */
  var revealEls = document.querySelectorAll(".reveal");
  if(revealEls.length){
    var io = new IntersectionObserver(function(entries){
      entries.forEach(function(entry){
        if(entry.isIntersecting){
          entry.target.classList.add("is-visible");
          io.unobserve(entry.target);
        }
      });
    }, { threshold:0.15, rootMargin:"0px 0px -40px 0px" });
    revealEls.forEach(function(el, i){
      el.style.setProperty("--i", i % 6);
      io.observe(el);
    });
  }

  /* ---------- Animated counters ---------- */
  var counters = document.querySelectorAll("[data-count]");
  if(counters.length){
    var animate = function(el){
      var target = parseFloat(el.getAttribute("data-count"));
      var suffix = el.getAttribute("data-suffix") || "";
      var duration = 1400;
      var start = null;
      function step(ts){
        if(start === null) start = ts;
        var progress = Math.min((ts - start) / duration, 1);
        var eased = 1 - Math.pow(1 - progress, 3);
        var value = Math.round(target * eased);
        el.textContent = value.toLocaleString("en-US") + suffix;
        if(progress < 1) requestAnimationFrame(step);
      }
      requestAnimationFrame(step);
    };
    var cio = new IntersectionObserver(function(entries){
      entries.forEach(function(entry){
        if(entry.isIntersecting){
          animate(entry.target);
          cio.unobserve(entry.target);
        }
      });
    }, { threshold:0.6 });
    counters.forEach(function(el){ cio.observe(el); });
  }

  /* ---------- Testimonial slider ---------- */
  var track = document.querySelector(".t-slides");
  if(track){
    var slides = track.querySelectorAll(".t-slide");
    var dotsWrap = document.querySelector(".t-dots");
    var index = 0;
    var isRTL = document.documentElement.getAttribute("dir") === "rtl";
    var timer;

    slides.forEach(function(_, i){
      var dot = document.createElement("button");
      dot.className = "t-dot" + (i === 0 ? " is-active" : "");
      dot.setAttribute("aria-label", "شريحة " + (i+1));
      dot.addEventListener("click", function(){ goTo(i); resetTimer(); });
      dotsWrap.appendChild(dot);
    });
    var dots = dotsWrap.querySelectorAll(".t-dot");

    function goTo(i){
      index = (i + slides.length) % slides.length;
      var pct = index * 100 * (isRTL ? 1 : -1);
      track.style.transform = "translateX(" + pct + "%)";
      dots.forEach(function(d, di){ d.classList.toggle("is-active", di === index); });
    }
    function resetTimer(){
      clearInterval(timer);
      timer = setInterval(function(){ goTo(index + 1); }, 6000);
    }
    if(slides.length > 1){
      resetTimer();
      var wrap = document.querySelector(".testimonials");
      wrap.addEventListener("mouseenter", function(){ clearInterval(timer); });
      wrap.addEventListener("mouseleave", resetTimer);

      /* ---- drag / swipe (mouse + touch) ---- */
      var dragStartX = 0, currentDx = 0, isDragging = false, trackWidth = 1;

      function pointerX(e){ return (e.touches ? e.touches[0].clientX : e.clientX); }

      function dragStart(e){
        isDragging = true;
        dragStartX = pointerX(e);
        trackWidth = wrap.getBoundingClientRect().width || 1;
        wrap.classList.add("is-dragging");
        clearInterval(timer);
      }
      function dragMove(e){
        if(!isDragging) return;
        currentDx = pointerX(e) - dragStartX;
        var basePct = index * 100 * (isRTL ? 1 : -1);
        var dragPct = (currentDx / trackWidth) * 100 * (isRTL ? -1 : 1);
        track.style.transform = "translateX(calc(" + basePct + "% + " + (dragPct * (isRTL ? -1 : 1)) + "%))";
      }
      function dragEnd(){
        if(!isDragging) return;
        isDragging = false;
        wrap.classList.remove("is-dragging");
        var threshold = trackWidth * 0.12;
        if(currentDx > threshold){ goTo(index + (isRTL ? 1 : -1)); }
        else if(currentDx < -threshold){ goTo(index + (isRTL ? -1 : 1)); }
        else{ goTo(index); }
        currentDx = 0;
        resetTimer();
      }

      wrap.addEventListener("mousedown", dragStart);
      window.addEventListener("mousemove", dragMove);
      window.addEventListener("mouseup", dragEnd);
      wrap.addEventListener("touchstart", dragStart, { passive:true });
      wrap.addEventListener("touchmove", dragMove, { passive:true });
      wrap.addEventListener("touchend", dragEnd);
      wrap.addEventListener("dragstart", function(e){ e.preventDefault(); });
    }
  }

  /* ---------- Hero full-bleed video: sync decorative slide dots ---------- */
  var heroVideo = document.querySelector(".hero-fullbleed video");
  var heroDots = document.querySelectorAll(".hero-dots .h-dot");
  if(heroVideo && heroDots.length){
    var segmentDuration = 5.9167; /* length of each concatenated source clip */
    heroVideo.addEventListener("timeupdate", function(){
      var idx = Math.floor(heroVideo.currentTime / segmentDuration) % heroDots.length;
      heroDots.forEach(function(dot, i){ dot.classList.toggle("is-active", i === idx); });
    });
  }

  /* ---------- Article "read more" modal ---------- */
  var articleModal = document.getElementById("articleModal");
  if(articleModal){
    var modalBody = articleModal.querySelector(".article-modal-body");
    var openBtns = document.querySelectorAll(".article-open-btn");
    var lastFocused = null;

    function openArticle(id){
      var tpl = document.getElementById(id);
      if(!tpl) return;
      modalBody.innerHTML = "";
      modalBody.appendChild(tpl.content.cloneNode(true));
      articleModal.classList.add("is-open");
      articleModal.setAttribute("aria-hidden", "false");
      document.body.classList.add("modal-open");
      lastFocused = document.activeElement;
      articleModal.querySelector(".article-modal-close").focus();
    }
    function closeArticle(){
      articleModal.classList.remove("is-open");
      articleModal.setAttribute("aria-hidden", "true");
      document.body.classList.remove("modal-open");
      if(lastFocused){ lastFocused.focus(); }
    }

    openBtns.forEach(function(btn){
      btn.addEventListener("click", function(){ openArticle(btn.getAttribute("data-article")); });
    });
    articleModal.querySelectorAll("[data-close]").forEach(function(el){
      el.addEventListener("click", closeArticle);
    });
    document.addEventListener("keydown", function(e){
      if(e.key === "Escape" && articleModal.classList.contains("is-open")){ closeArticle(); }
    });
  }

  /* ---------- Dark mode toggle ---------- */
  var THEME_KEY = "qasimi-theme";
  var themeToggles = document.querySelectorAll(".theme-toggle");
  if(themeToggles.length){
    themeToggles.forEach(function(btn){
      btn.addEventListener("click", function(){
        var isDark = document.documentElement.classList.toggle("theme-dark");
        try{ localStorage.setItem(THEME_KEY, isDark ? "dark" : "light"); }catch(e){}
      });
    });
  }

})();
