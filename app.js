/* ProspectB2B PRO — comportamento e medição do site institucional v2 */
(function () {
  "use strict";

  var cfg = window.PROSPECT_CONFIG || {};
  var CDN = cfg.cdn || "";
  var CHAVE_CONSENT = "p2b-consent-v1";

  /* ---------- utilidades ---------- */
  function $(sel, ctx) { return (ctx || document).querySelector(sel); }
  function $$(sel, ctx) { return Array.prototype.slice.call((ctx || document).querySelectorAll(sel)); }

  function lerConsent() {
    try { return window.localStorage.getItem(CHAVE_CONSENT); } catch (e) { return null; }
  }
  function gravarConsent(valor) {
    try { window.localStorage.setItem(CHAVE_CONSENT, valor); } catch (e) { /* modo privado */ }
  }

  /* ---------- medição (só carrega terceiros com consentimento e ID) ---------- */
  var medicaoAtiva = false;
  var fila = [];

  function enviar(nome, params) {
    if (!medicaoAtiva) { fila.push([nome, params]); return; }
    disparar(nome, params);
  }

  function disparar(nome, params) {
    try {
      if (typeof window.fbq === "function") {
        var mapa = {
          page_view: "PageView",
          view_content: "ViewContent",
          initiate_checkout: "InitiateCheckout"
        };
        if (mapa[nome]) window.fbq("track", mapa[nome], params || {});
        else window.fbq("trackCustom", nome, params || {});
      }
      if (typeof window.gtag === "function" && cfg.ga4Id) {
        window.gtag("event", nome, params || {});
      }
    } catch (e) { /* medição nunca deve quebrar a página */ }
  }

  function ativarMedicao() {
    if (medicaoAtiva) return;
    medicaoAtiva = true;

    if (cfg.metaPixelId) {
      (function (f, b, e, v) {
        var n, t, s;
        if (f.fbq) return;
        n = f.fbq = function () {
          n.callMethod ? n.callMethod.apply(n, arguments) : n.queue.push(arguments);
        };
        if (!f._fbq) f._fbq = n;
        n.push = n; n.loaded = true; n.version = "2.0"; n.queue = [];
        t = b.createElement(e); t.async = true; t.src = v;
        s = b.getElementsByTagName(e)[0]; s.parentNode.insertBefore(t, s);
      }(window, document, "script", "https://connect.facebook.net/en_US/fbevents.js"));
      window.fbq("init", cfg.metaPixelId);
    }

    if (cfg.ga4Id) {
      var g = document.createElement("script");
      g.async = true;
      g.src = "https://www.googletagmanager.com/gtag/js?id=" + encodeURIComponent(cfg.ga4Id);
      document.head.appendChild(g);
      window.dataLayer = window.dataLayer || [];
      window.gtag = function () { window.dataLayer.push(arguments); };
      window.gtag("js", new Date());
      window.gtag("config", cfg.ga4Id, { anonymize_ip: true });
    }

    fila.forEach(function (item) { disparar(item[0], item[1]); });
    fila = [];
  }

  var BASE = { content_name: "ProspectB2B PRO", content_category: "software", currency: "BRL" };

  function iniciarMedicao() {
    var temIds = Boolean(cfg.metaPixelId || cfg.ga4Id);
    var banner = $("[data-consent]");

    if (!temIds) {
      /* sem IDs reais, nenhum script de terceiros é carregado */
      medicaoAtiva = true;
      return;
    }
    var escolha = lerConsent();
    if (escolha === "aceito") { ativarMedicao(); return; }
    if (escolha === "recusado") { return; }
    if (banner) {
      banner.setAttribute("data-visible", "true");
      var aceitar = $("[data-consent-accept]", banner);
      var recusar = $("[data-consent-decline]", banner);
      if (aceitar) aceitar.addEventListener("click", function () {
        gravarConsent("aceito");
        banner.removeAttribute("data-visible");
        ativarMedicao();
      });
      if (recusar) recusar.addEventListener("click", function () {
        gravarConsent("recusado");
        banner.removeAttribute("data-visible");
      });
    }
  }

  /* ---------- menu mobile ---------- */
  var toggle = $(".nav-toggle");
  var menu = $("#menu-mobile");
  if (toggle && menu) {
    toggle.addEventListener("click", function () {
      var aberto = toggle.getAttribute("aria-expanded") === "true";
      toggle.setAttribute("aria-expanded", String(!aberto));
      toggle.setAttribute("aria-label", aberto ? "Abrir menu" : "Fechar menu");
      menu.hidden = aberto;
    });
    menu.addEventListener("click", function (evento) {
      if (evento.target.tagName === "A") {
        menu.hidden = true;
        toggle.setAttribute("aria-expanded", "false");
        toggle.setAttribute("aria-label", "Abrir menu");
      }
    });
    document.addEventListener("keydown", function (evento) {
      if (evento.key === "Escape" && !menu.hidden) {
        menu.hidden = true;
        toggle.setAttribute("aria-expanded", "false");
        toggle.focus();
      }
    });
  }

  /* ---------- ano no rodapé ---------- */
  $$("[data-ano]").forEach(function (el) { el.textContent = String(new Date().getFullYear()); });

  /* ---------- vídeo: fachada que só carrega o arquivo ao clicar ---------- */
  var blocoVideo = $("[data-video-block]");
  var botaoVideo = $("[data-video-play]");
  if (blocoVideo && botaoVideo) {
    botaoVideo.addEventListener("click", function () {
      var fonte = cfg.videoSrc || (CDN + "/video/demonstracao.mp4");
      var poster = cfg.videoPoster || (CDN + "/video/poster.jpg");
      var video = document.createElement("video");
      video.controls = true;
      video.playsInline = true;
      video.preload = "metadata";
      video.poster = poster;
      video.setAttribute("aria-label", "Demonstração do ProspectB2B PRO");
      var source = document.createElement("source");
      source.src = fonte;
      source.type = "video/mp4";
      video.appendChild(source);

      /* garante que nenhum outro vídeo siga tocando */
      $$("video").forEach(function (outro) { try { outro.pause(); } catch (e) {} });

      blocoVideo.innerHTML = "";
      blocoVideo.appendChild(video);
      var p = video.play();
      if (p && typeof p.catch === "function") p.catch(function () { /* autoplay bloqueado: usuário usa os controles */ });
      enviar("video_play", Object.assign({}, BASE));
    });
  }

  /* ---------- eventos comerciais ---------- */
  $$("[data-checkout]").forEach(function (link) {
    link.addEventListener("click", function () {
      enviar("initiate_checkout", Object.assign({}, BASE, { value: 997.0, currency: "BRL" }));
    });
  });

  $$("[data-support]").forEach(function (link) {
    link.addEventListener("click", function () {
      enviar("support_click", Object.assign({}, BASE));
    });
  });

  /* ---------- visualização da oferta ---------- */
  var oferta = $("#licenca");
  if (oferta && "IntersectionObserver" in window) {
    var observadorOferta = new IntersectionObserver(function (entradas) {
      entradas.forEach(function (entrada) {
        if (entrada.isIntersecting) {
          enviar("view_offer", Object.assign({}, BASE, { value: 997.0, currency: "BRL" }));
          observadorOferta.disconnect();
        }
      });
    }, { threshold: 0.35 });
    observadorOferta.observe(oferta);
  }

  /* ---------- animação de entrada ---------- */
  if ("IntersectionObserver" in window && !window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
    var alvos = $$(".problem-item, .feature, .shot-grid figure, .flow li, .diff-item, .trans-item, .price-card, .profile-col, .spec-table");
    alvos.forEach(function (el) { el.classList.add("reveal"); });
    var observador = new IntersectionObserver(function (entradas) {
      entradas.forEach(function (entrada) {
        if (entrada.isIntersecting) {
          entrada.target.classList.add("is-in");
          observador.unobserve(entrada.target);
        }
      });
    }, { rootMargin: "0px 0px -6% 0px", threshold: 0.06 });
    alvos.forEach(function (el) { observador.observe(el); });
  }

  /* ---------- início ---------- */
  iniciarMedicao();
  enviar("page_view", Object.assign({}, BASE));
  enviar("view_content", Object.assign({}, BASE, { value: 997.0, currency: "BRL" }));

  if (window.console && cfg.versao) {
    console.info("ProspectB2B PRO — site v" + cfg.versao);
  }
})();
