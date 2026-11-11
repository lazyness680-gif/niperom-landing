/*
 * ЛОГИКА СТРАНИЦЫ
 * ---------------
 * Рендер контента из js/content.js, навигация, анимации,
 * лиса-проводник, форма заявки и аналитика.
 * Ничего не нужно менять здесь, если правки касаются только текста и ссылок.
 */
(function () {
  "use strict";

  var CONTENT = window.SITE_CONTENT;
  if (!CONTENT) {
    console.error("SITE_CONTENT не найден. Проверьте подключение js/content.js.");
    return;
  }

  var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var $ = function (selector, root) {
    return (root || document).querySelector(selector);
  };
  var $$ = function (selector, root) {
    return Array.prototype.slice.call((root || document).querySelectorAll(selector));
  };

  /* ---------- Утилиты ---------- */

  function escapeHtml(value) {
    return String(value == null ? "" : value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function formatText(value) {
    return escapeHtml(value).replace(/\[([^\]]+)\]/g, function (_, text) {
      return '<span class="placeholder">[' + text + "]</span>";
    });
  }

  function setRichText(element, value) {
    if (!element || value == null) return;
    element.innerHTML = formatText(value);
  }

  function getPath(object, path) {
    return path.split(".").reduce(function (acc, key) {
      return acc == null ? undefined : acc[key];
    }, object);
  }

  function pad(number) {
    return String(number).padStart(2, "0");
  }

  function safeUrl(value) {
    var url = String(value == null ? "" : value).trim();
    if (!url || url === "#") return "";
    if (/^(https?:\/\/|mailto:|tel:|\/)/i.test(url)) return url;
    return "";
  }

  function externalAttrs(url) {
    return /^https?:\/\//i.test(url)
      ? ' target="_blank" rel="noopener noreferrer"'
      : "";
  }

  function icon(name, extraClass) {
    return (
      '<svg class="icon' +
      (extraClass ? " " + extraClass : "") +
      '" aria-hidden="true"><use href="#i-' +
      name +
      '"></use></svg>'
    );
  }

  function chocoMarkup(number) {
    return (
      '<div class="choco" aria-hidden="true">' +
      '<span class="choco__foil choco__foil--top"></span>' +
      '<span class="choco__body">' +
      '<span class="choco__pattern"></span>' +
      '<span class="choco__kicker">премиальный шоколад</span>' +
      '<span class="choco__crest"><svg viewBox="0 0 44 44"><path d="M22 6c.8 8 5.9 13.2 14 14-8.1.8-13.2 6-14 14-.8-8-5.9-13.2-14-14 8.1-.8 13.2-6 14-14Z" fill="currentColor"/><circle cx="22" cy="22" r="17" fill="none" stroke="currentColor" stroke-width="1" opacity=".7"/></svg></span>' +
      '<span class="choco__name">НИ В СКАЗКЕ<br>СКАЗАТЬ</span>' +
      '<span class="choco__sub">ни пером описать</span>' +
      '<span class="choco__line"></span>' +
      '<span class="choco__taste">вкус ' +
      escapeHtml(number) +
      "</span>" +
      "</span>" +
      '<span class="choco__foil choco__foil--bottom"></span>' +
      "</div>"
    );
  }

  function initial(name) {
    if (String(name).indexOf("[") !== -1) return "✦";
    var clean = String(name).replace(/[[\]]/g, "").trim();
    return clean ? clean.charAt(0).toUpperCase() : "✦";
  }

  function marketplaceById(id) {
    return (CONTENT.links.marketplaces || []).filter(function (item) {
      return item.id === id;
    })[0];
  }

  function contactUrl() {
    var email = String(CONTENT.links.email || "").trim();
    if (email) return "mailto:" + email;
    var social = (CONTENT.links.socials || []).filter(function (item) {
      return safeUrl(item.url);
    })[0];
    if (social) return safeUrl(social.url);
    var messenger = safeUrl(CONTENT.links.messengers);
    return messenger;
  }

  /* ---------- Тост ---------- */

  var toastTimer = null;
  function showToast(message) {
    var toast = $("#toast");
    if (!toast) return;
    toast.textContent = message;
    toast.classList.add("is-visible");
    window.clearTimeout(toastTimer);
    toastTimer = window.setTimeout(function () {
      toast.classList.remove("is-visible");
    }, 4200);
  }

  /* ---------- Аналитика ---------- */

  var analytics = CONTENT.analytics || {};
  var metrikaId = String(analytics.yandexMetrikaId || "").trim();
  var gaId = String(analytics.googleAnalyticsId || "").trim();

  function track(eventName, params) {
    var data = params || {};
    try {
      if (metrikaId && typeof window.ym === "function") {
        window.ym(metrikaId, "reachGoal", eventName, data);
      }
      if (gaId && typeof window.gtag === "function") {
        window.gtag("event", eventName, data);
      }
    } catch (error) {
      /* Аналитика не должна ломать страницу. */
    }
  }

  function initAnalytics() {
    if (metrikaId) {
      window.ym =
        window.ym ||
        function () {
          (window.ym.a = window.ym.a || []).push(arguments);
        };
      window.ym.l = Date.now();
      var metrikaScript = document.createElement("script");
      metrikaScript.async = true;
      metrikaScript.src = "https://mc.yandex.ru/metrika/tag.js";
      document.head.appendChild(metrikaScript);
      window.ym(metrikaId, "init", {
        clickmap: true,
        trackLinks: true,
        accurateTrackBounce: true,
        webvisor: Boolean(analytics.webvisor),
      });
    }

    if (gaId) {
      window.dataLayer = window.dataLayer || [];
      window.gtag =
        window.gtag ||
        function () {
          window.dataLayer.push(arguments);
        };
      var gaScript = document.createElement("script");
      gaScript.async = true;
      gaScript.src =
        "https://www.googletagmanager.com/gtag/js?id=" +
        encodeURIComponent(gaId);
      document.head.appendChild(gaScript);
      window.gtag("js", new Date());
      window.gtag("config", gaId, { anonymize_ip: true });
    }
  }

  /* ---------- Рендер контента ---------- */

  function renderBindings() {
    $$("[data-bind]").forEach(function (element) {
      var value = getPath(CONTENT, element.getAttribute("data-bind"));
      if (value != null && typeof value !== "object") {
        setRichText(element, value);
      }
    });
  }

  function renderPains() {
    var grid = $("#painsGrid");
    if (!grid) return;
    grid.innerHTML = (CONTENT.pains.items || [])
      .map(function (text, index) {
        return (
          '<article class="quote-card reveal" style="--reveal-delay:' +
          index * 90 +
          'ms">' +
          '<div class="quote-card__top">' +
          '<span class="quote-card__number">' +
          pad(index + 1) +
          "</span>" +
          '<span class="quote-card__icon">' +
          icon("quote") +
          "</span>" +
          "</div>" +
          '<p class="quote-card__text">' +
          formatText(text) +
          "</p>" +
          '<span class="quote-card__mark" aria-hidden="true">”</span>' +
          "</article>"
        );
      })
      .join("");
  }

  function renderBenefits() {
    var grid = $("#benefitGrid");
    var marquee = $("#benefitMarquee");
    var items = CONTENT.benefits.items || [];
    var marqueeItems = (CONTENT.benefits.marquee || []).concat(
      CONTENT.benefits.marquee || []
    );

    if (grid) {
      grid.innerHTML = items
        .map(function (item, index) {
          return (
            '<article class="benefit-card reveal" style="--reveal-delay:' +
            index * 80 +
            'ms">' +
            '<span class="benefit-card__icon">' +
            icon(item.icon) +
            "</span>" +
            '<span class="benefit-card__index">' +
            pad(index + 1) +
            "</span>" +
            "<h3>" +
            formatText(item.title) +
            "</h3>" +
            "<p>" +
            formatText(item.text) +
            "</p>" +
            "</article>"
          );
        })
        .join("");
    }

    if (marquee) {
      marquee.innerHTML = marqueeItems
        .map(function (text) {
          return '<span class="marquee__item">' + formatText(text) + "</span>";
        })
        .join("");
    }
  }

  function renderFlavors() {
    var grid = $("#flavorGrid");
    if (!grid) return;

    grid.innerHTML = (CONTENT.collection.flavors || [])
      .map(function (flavor, index) {
        return (
          '<article class="flavor-card flavor-card--' +
          escapeHtml(flavor.theme) +
          ' reveal" style="--reveal-delay:' +
          index * 90 +
          "ms;--i:" +
          index +
          '">' +
          '<div class="flavor-card__world" aria-hidden="true">' +
          '<span class="flavor-card__ring"></span>' +
          '<span class="flavor-card__moon"></span>' +
          '<span class="flavor-card__cloud flavor-card__cloud--1"></span>' +
          '<span class="flavor-card__cloud flavor-card__cloud--2"></span>' +
          '<span class="flavor-card__shard flavor-card__shard--1"></span>' +
          '<span class="flavor-card__shard flavor-card__shard--2"></span>' +
          '<span class="flavor-card__shard flavor-card__shard--3"></span>' +
          "</div>" +
          '<div class="flavor-card__top">' +
          '<span class="flavor-card__number">' +
          escapeHtml(flavor.number) +
          "</span>" +
          '<span class="flavor-card__badge">' +
          formatText(flavor.badge || "4 вкуса") +
          "</span>" +
          "</div>" +
          '<div class="flavor-card__pack">' +
          chocoMarkup(flavor.number) +
          "</div>" +
          '<div class="flavor-card__info">' +
          "<h3>" +
          formatText(flavor.name) +
          "</h3>" +
          "<p>" +
          formatText(flavor.description) +
          "</p>" +
          '<p class="flavor-card__composition">' +
          "<span>Состав</span> " +
          formatText(flavor.composition) +
          "</p>" +
          '<a class="flavor-card__link" href="#where" aria-label="' +
          escapeHtml(CONTENT.collection.cta + " — " + flavor.name) +
          '" data-track="flavor_' +
          escapeHtml(flavor.theme) +
          '">' +
          formatText(CONTENT.collection.cta) +
          icon("arrow") +
          "</a>" +
          "</div>" +
          '<span class="flavor-card__shine" aria-hidden="true"></span>' +
          "</article>"
        );
      })
      .join("");
  }

  function renderQuality() {
    var blocks = $("#qualityBlocks");
    var facts = $("#qualityFacts");

    if (blocks) {
      blocks.innerHTML = (CONTENT.quality.blocks || [])
        .map(function (block, index) {
          return (
            '<div class="quality-block reveal" style="--reveal-delay:' +
            index * 80 +
            'ms">' +
            '<span class="quality-block__icon">' +
            icon(block.icon) +
            "</span>" +
            "<h3>" +
            formatText(block.title) +
            "</h3>" +
            "<p>" +
            formatText(block.text) +
            "</p>" +
            "</div>"
          );
        })
        .join("");
    }

    if (facts) {
      facts.innerHTML = (CONTENT.quality.facts || [])
        .map(function (fact, index) {
          return (
            '<div class="fact-item">' +
            '<span class="fact-item__num">' +
            pad(index + 1) +
            "</span>" +
            "<span>" +
            formatText(fact) +
            "</span>" +
            "</div>"
          );
        })
        .join("");
    }
  }

  function renderMarkets() {
    var grid = $("#marketGrid");
    if (!grid) return;

    grid.innerHTML = (CONTENT.links.marketplaces || [])
      .map(function (market, index) {
        var url = safeUrl(market.url);
        var short = String(market.short || market.name || "").trim();
        var status = url ? "Перейти на площадку" : "Ссылка уточняется";
        var label = url
          ? market.name + " — " + (CONTENT.ui.externalLink || "Открыть")
          : market.name + " — ссылка уточняется";

        return (
          '<a class="market-card reveal" href="' +
          (url || "#where") +
          '" style="--accent:' +
          escapeHtml(market.color || "#bd3f61") +
          '" data-market="' +
          escapeHtml(market.id) +
          '" data-track="market_' +
          escapeHtml(market.id) +
          '" aria-label="' +
          escapeHtml(label) +
          '"' +
          externalAttrs(url) +
          ">" +
          '<span class="market-card__top">' +
          '<span class="market-card__badge' +
          (short.length > 2 ? " market-card__badge--text" : "") +
          '">' +
          escapeHtml(short) +
          "</span>" +
          '<span class="market-card__arrow">' +
          icon("arrow") +
          "</span>" +
          "</span>" +
          '<div class="market-card__body">' +
          "<h3>" +
          escapeHtml(market.name) +
          "</h3>" +
          "<p>" +
          formatText(market.note) +
          "</p>" +
          '<span class="market-card__status">' +
          status +
          "</span>" +
          "</div>" +
          "</a>"
        );
      })
      .join("");
  }

  function renderReviews() {
    var grid = $("#reviewGrid");
    var links = $("#reviewLinks");

    if (grid) {
      grid.innerHTML = (CONTENT.reviews.items || [])
        .map(function (review, index) {
          var rating = String(review.rating || "").trim();
          return (
            '<article class="review-card reveal" style="--reveal-delay:' +
            index * 90 +
            'ms">' +
            '<div class="review-card__head">' +
            '<svg class="review-card__quote" aria-hidden="true"><use href="#i-quote"></use></svg>' +
            '<span class="review-card__rating">' +
            icon("star") +
            "<span>" +
            formatText(rating || "—") +
            "</span></span>" +
            "</div>" +
            '<blockquote class="review-card__text">' +
            formatText(review.text) +
            "</blockquote>" +
            '<div class="review-card__author">' +
            '<span class="review-card__avatar" aria-hidden="true">' +
            initial(review.name) +
            "</span>" +
            '<span class="review-card__meta">' +
            '<span class="review-card__name">' +
            formatText(review.name) +
            "</span>" +
            '<span class="review-card__platform">' +
            formatText(review.platform) +
            "</span>" +
            "</span>" +
            "</div>" +
            "</article>"
          );
        })
        .join("");
    }

    if (links) {
      links.innerHTML = (CONTENT.links.marketplaces || [])
        .filter(function (market) {
          return market.id !== "partners";
        })
        .map(function (market) {
          var url = safeUrl(market.reviewsUrl);
          return (
            '<a class="review-link" href="' +
            (url || "#reviews") +
            '" data-review="' +
            escapeHtml(market.id) +
            '" data-track="reviews_' +
            escapeHtml(market.id) +
            '"' +
            externalAttrs(url) +
            ">" +
            icon("star") +
            "<span>" +
            escapeHtml(market.name) +
            "</span></a>"
          );
        })
        .join("");
    }
  }

  function renderOccasions() {
    var grid = $("#occasionGrid");
    if (!grid) return;

    grid.innerHTML = (CONTENT.occasions.items || [])
      .map(function (item, index) {
        return (
          '<article class="occasion-card reveal" style="--reveal-delay:' +
          index * 80 +
          'ms">' +
          '<span class="occasion-card__num">' +
          pad(index + 1) +
          "</span>" +
          '<span class="occasion-card__icon">' +
          icon(item.icon) +
          "</span>" +
          "<h3>" +
          formatText(item.title) +
          "</h3>" +
          "<p>" +
          formatText(item.text) +
          "</p>" +
          "</article>"
        );
      })
      .join("");
  }

  function renderContacts() {
    var email = String(CONTENT.links.email || "").trim();
    var phone = String(CONTENT.links.phone || "").trim();
    var messengers = String(CONTENT.links.messengers || "").trim();
    var emailEl = $("#contactEmail");
    var phoneEl = $("#contactPhone");
    var messengersEl = $("#contactMessengers");
    var socials = $("#socialLinks");
    var cta = $("#contactCta");

    if (emailEl) {
      if (email) {
        emailEl.textContent = email;
        emailEl.href = "mailto:" + email;
        emailEl.classList.remove("placeholder");
        emailEl.removeAttribute("data-placeholder-link");
      } else {
        emailEl.innerHTML = formatText("[email — запросить у заказчика]");
        emailEl.href = "#contacts";
        emailEl.setAttribute("data-placeholder-link", "email");
      }
    }

    if (phoneEl) {
      if (phone) {
        phoneEl.textContent = phone;
        phoneEl.href = "tel:" + phone.replace(/[^\d+]/g, "");
        phoneEl.classList.remove("placeholder");
        phoneEl.removeAttribute("data-placeholder-link");
      } else {
        phoneEl.innerHTML = formatText("[телефон — запросить у заказчика]");
        phoneEl.href = "#contacts";
        phoneEl.setAttribute("data-placeholder-link", "phone");
      }
    }

    if (messengersEl) {
      if (messengers) {
        messengersEl.textContent = messengers;
      } else {
        messengersEl.innerHTML = formatText(
          "[мессенджеры — запросить у заказчика]"
        );
      }
    }

    if (socials) {
      socials.innerHTML = (CONTENT.links.socials || [])
        .map(function (social) {
          var url = safeUrl(social.url);
          return (
            '<a class="social-link" href="' +
            (url || "#contacts") +
            '" data-social="' +
            escapeHtml(social.name) +
            '" data-track="social_' +
            escapeHtml(social.icon) +
            '"' +
            externalAttrs(url) +
            ">" +
            icon(social.icon) +
            "<span>" +
            escapeHtml(social.name) +
            "</span></a>"
          );
        })
        .join("");
    }

    if (cta) {
      var url = contactUrl();
      cta.setAttribute("href", url || "#contacts");
      if (url) {
        if (/^https?:\/\//i.test(url)) {
          cta.setAttribute("target", "_blank");
          cta.setAttribute("rel", "noopener noreferrer");
        }
      }
    }
  }

  function renderPrivacyLinks() {
    $$("[data-placeholder-link='privacy']").forEach(function (link) {
      var url = safeUrl(CONTENT.links.privacyUrl);
      if (url) {
        link.setAttribute("href", url);
        link.textContent = "политику конфиденциальности";
        link.classList.remove("placeholder");
      } else {
        link.setAttribute("href", "#");
        link.innerHTML = formatText("[политику конфиденциальности]");
      }
    });
  }

  function renderAll() {
    renderBindings();
    renderPains();
    renderBenefits();
    renderFlavors();
    renderQuality();
    renderMarkets();
    renderReviews();
    renderOccasions();
    renderContacts();
    renderPrivacyLinks();

    var year = $("#currentYear");
    if (year) year.textContent = new Date().getFullYear();
  }

  /* ---------- Появление секций ---------- */

  function prepareReveals() {
    var selectors = [
      ".section-head",
      ".story__visual",
      ".story__quote",
      ".story__facts",
      ".story__signature",
      ".quality__art",
      ".urgency__copy",
      ".urgency__decor",
      ".form-card",
      ".contact-card",
      ".collection__foot",
      ".purchase-notes",
      ".partners__details",
      ".benefits__note",
      ".reviews__actions",
    ];

    selectors.forEach(function (selector) {
      $$(selector).forEach(function (element) {
        element.classList.add("reveal");
      });
    });
  }

  function initReveal() {
    var elements = $$(".reveal");
    if (!elements.length) return;

    if (reduceMotion || !("IntersectionObserver" in window)) {
      elements.forEach(function (element) {
        element.classList.add("is-visible");
      });
      return;
    }

    var observer = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (!entry.isIntersecting) return;
          entry.target.classList.add("is-visible");
          observer.unobserve(entry.target);
        });
      },
      { threshold: 0.1, rootMargin: "0px 0px -4% 0px" }
    );

    elements.forEach(function (element) {
      observer.observe(element);
    });
  }

  /* ---------- Шапка и мобильное меню ---------- */

  function initHeader() {
    var header = $("[data-header]");
    if (!header) return;

    function update() {
      header.classList.toggle("is-scrolled", window.scrollY > 24);
    }

    window.addEventListener("scroll", update, { passive: true });
    update();
  }

  function initMenu() {
    var menu = $("#mobileMenu");
    var toggle = $("[data-menu-toggle]");
    var close = $("[data-menu-close]");
    if (!menu || !toggle) return;

    var lastFocused = null;
    var closeLabel = CONTENT.ui.menuClose || "Закрыть меню";
    var openLabel = CONTENT.ui.menuOpen || "Открыть меню";

    function focusable() {
      return $$("a[href], button:not([disabled])", menu).filter(function (el) {
        return el.offsetParent !== null;
      });
    }

    function openMenu() {
      lastFocused = document.activeElement;
      menu.classList.add("is-open");
      menu.setAttribute("aria-hidden", "false");
      toggle.setAttribute("aria-expanded", "true");
      toggle.setAttribute("aria-label", closeLabel);
      document.body.classList.add("menu-open");
      window.setTimeout(function () {
        if (close) close.focus();
      }, 50);
      track("menu_open");
    }

    function closeMenu() {
      if (!menu.classList.contains("is-open")) return;
      menu.classList.remove("is-open");
      menu.setAttribute("aria-hidden", "true");
      toggle.setAttribute("aria-expanded", "false");
      toggle.setAttribute("aria-label", openLabel);
      document.body.classList.remove("menu-open");
      if (lastFocused && typeof lastFocused.focus === "function") {
        lastFocused.focus();
      }
    }

    toggle.addEventListener("click", function () {
      if (menu.classList.contains("is-open")) closeMenu();
      else openMenu();
    });

    if (close) close.addEventListener("click", closeMenu);

    menu.addEventListener("click", function (event) {
      if (event.target.closest("a")) closeMenu();
    });

    document.addEventListener("keydown", function (event) {
      if (!menu.classList.contains("is-open")) return;
      if (event.key === "Escape") {
        closeMenu();
        return;
      }
      if (event.key !== "Tab") return;
      var items = focusable();
      if (!items.length) return;
      var first = items[0];
      var last = items[items.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    });

    window.addEventListener("resize", function () {
      if (window.innerWidth > 1080) closeMenu();
    });
  }

  /* ---------- Подсветка навигации ---------- */

  function initScrollSpy() {
    var sections = [
      "collection",
      "story",
      "quality",
      "where",
      "reviews",
      "occasions",
      "partners",
      "contacts",
    ];
    var links = $$(".site-nav a, .mobile-nav a");
    if (!links.length) return;
    var current = "";

    function update() {
      var marker = window.scrollY + window.innerHeight * 0.36;
      var active = "";
      sections.forEach(function (id) {
        var section = document.getElementById(id);
        if (section && section.offsetTop <= marker) active = id;
      });
      if (
        window.scrollY + window.innerHeight >=
        document.documentElement.scrollHeight - 4
      ) {
        active = "contacts";
      }
      if (active === current) return;
      current = active;
      links.forEach(function (link) {
        var hash = link.getAttribute("href") || "";
        link.classList.toggle("is-active", hash === "#" + active);
      });
    }

    window.addEventListener("scroll", update, { passive: true });
    update();
  }

  /* ---------- Лиса-проводник ---------- */

  function initFoxGuide() {
    var guideElement = $("[data-fox-guide]");
    var nextButton = $("[data-fox-next]");
    var bubble = $("#foxBubble");
    var guide = Array.isArray(CONTENT.guide) ? CONTENT.guide : [];
    if (!guideElement || !nextButton || !guide.length) return;

    var entries = guide.map(function (item) {
      return {
        section: item.section,
        text: item.text,
        element: document.getElementById(
          item.section === "top" ? "top" : item.section
        ),
      };
    });
    var activeIndex = 0;
    var speakTimer = null;

    function nearestIndex() {
      var index = 0;
      entries.forEach(function (entry, position) {
        if (!entry.element) return;
        if (entry.element.getBoundingClientRect().top <= window.innerHeight * 0.48) {
          index = position;
        }
      });
      return index;
    }

    function speak(text) {
      if (!bubble) return;
      bubble.textContent = text;
      guideElement.classList.add("is-speaking");
      window.clearTimeout(speakTimer);
      speakTimer = window.setTimeout(function () {
        guideElement.classList.remove("is-speaking");
      }, 3600);
    }

    function update() {
      guideElement.classList.toggle(
        "is-visible",
        window.scrollY > window.innerHeight * 0.45
      );
      var index = nearestIndex();
      if (index !== activeIndex) {
        activeIndex = index;
        if (!guideElement.classList.contains("is-speaking") && bubble) {
          bubble.textContent = entries[index].text;
        }
      }
    }

    nextButton.addEventListener("click", function () {
      var index = nearestIndex();
      var next = entries[(index + 1) % entries.length];
      activeIndex = (index + 1) % entries.length;
      speak(next.text);
      if (next.element) {
        next.element.scrollIntoView({
          behavior: reduceMotion ? "auto" : "smooth",
          block: "start",
        });
      }
      track("fox_guide", { section: next.section });
    });

    window.addEventListener("scroll", update, { passive: true });
    update();
  }

  /* ---------- Недоступные ссылки ---------- */

  function initPlaceholderLinks() {
    document.addEventListener("click", function (event) {
      var target = event.target.closest(
        "a[data-placeholder-link], a[data-market], a[data-review], a[data-social], [data-contact-cta]"
      );
      if (!target) return;

      var message = CONTENT.ui.placeholderLink;
      var blocked = false;
      var key = target.getAttribute("data-placeholder-link");

      if (key === "privacy") {
        blocked = !safeUrl(CONTENT.links.privacyUrl);
      } else if (key === "email") {
        blocked = !String(CONTENT.links.email || "").trim();
      } else if (key === "phone") {
        blocked = !String(CONTENT.links.phone || "").trim();
      } else if (target.hasAttribute("data-market")) {
        var market = marketplaceById(target.getAttribute("data-market"));
        blocked = !market || !safeUrl(market.url);
        if (market && blocked) {
          message = market.name + ": " + message;
        }
      } else if (target.hasAttribute("data-review")) {
        var reviewMarket = marketplaceById(target.getAttribute("data-review"));
        blocked = !reviewMarket || !safeUrl(reviewMarket.reviewsUrl);
        if (reviewMarket && blocked) {
          message = reviewMarket.name + ": " + message;
        }
      } else if (target.hasAttribute("data-social")) {
        var socialName = target.getAttribute("data-social");
        var social = (CONTENT.links.socials || []).filter(function (item) {
          return item.name === socialName;
        })[0];
        blocked = !social || !safeUrl(social.url);
        if (social && blocked) {
          message = social.name + ": " + message;
        }
      } else if (target.hasAttribute("data-contact-cta")) {
        blocked = !contactUrl();
      }

      if (!blocked) return;
      event.preventDefault();
      showToast(message);
    });

    var toast = $("#toast");
    if (toast) {
      toast.addEventListener("click", function () {
        toast.classList.remove("is-visible");
      });
    }
  }

  /* ---------- Клики и трекинг ---------- */

  function initTracking() {
    document.addEventListener("click", function (event) {
      var target = event.target.closest("[data-track]");
      if (!target) return;
      track(target.getAttribute("data-track"), {
        label: (target.textContent || "").trim().replace(/\s+/g, " ").slice(0, 80),
      });
    });
  }

  /* ---------- Запуск ---------- */

  function init() {
    renderAll();
    prepareReveals();
    initReveal();
    initHeader();
    initMenu();
    initScrollSpy();
    initFoxGuide();
    initPlaceholderLinks();
    initTracking();
    initAnalytics();

    document.documentElement.classList.add("js");
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
