/**
 * Генератор виджет-скрипта, который агент вставляет на свой сайт.
 *
 * Скрипт ищет контейнеры с `data-krent-widget-agent` и подставляет в
 * них iframe со страницей `/widget/[agentId]?view=&theme=`. Поддержанные
 * data-атрибуты:
 *
 *   data-krent-widget-agent    UUID агента (обязательно)
 *   data-krent-widget-view     list | grid | map | featured | compact | search (default: list)
 *   data-krent-widget-theme    light | dark | brand | custom (default: light)
 *   data-krent-widget-height   высота iframe в px (default: 900)
 *   data-krent-widget-locale   ISO-локаль (default: en)
 *
 * Сторонний сайт может подписаться на события виджета через
 * `window.addEventListener('message', handler)`. Виджет постит сообщения
 * вида `{ source: 'krent-widget', type, payload }` с типами:
 *
 *   krent-widget:ready            виджет смонтирован
 *   krent-widget:error            ошибка загрузки
 *   krent-widget:property-click   гость кликнул на объект
 *   krent-widget:lead-submit      гость отправил лид
 *   krent-widget:booking-request  гость отправил запрос на бронирование
 *
 * А также удобные window-callback'и (если объявлены до загрузки скрипта):
 *
 *   window.krentOnReady, krentOnError, krentOnPropertyClick,
 *   krentOnLeadSubmit, krentOnBookingRequest
 */

export const WIDGET_VIEWS = [
  "list",
  "grid",
  "map",
  "featured",
  "compact",
  "search",
] as const;

export const WIDGET_THEMES = [
  "light",
  "dark",
  "brand",
  "custom",
] as const;

export function buildWidgetScript(baseUrl: string): string {
  const safeBase = trimTrailingSlash(baseUrl);
  return `(function(){
  var BASE = ${JSON.stringify(safeBase)};
  var VIEWS = ${JSON.stringify(WIDGET_VIEWS)};
  var THEMES = ${JSON.stringify(WIDGET_THEMES)};

  function call(name, payload){
    try {
      var fn = (window)[name];
      if (typeof fn === 'function') fn(payload);
    } catch(e){}
  }

  function mount(node){
    if (node.dataset.krentMounted === '1') return;
    node.dataset.krentMounted = '1';
    var agent = node.getAttribute('data-krent-widget-agent');
    if (!agent) return;
    var view = node.getAttribute('data-krent-widget-view') || 'list';
    if (VIEWS.indexOf(view) === -1) view = 'list';
    var theme = node.getAttribute('data-krent-widget-theme') || 'light';
    if (THEMES.indexOf(theme) === -1) theme = 'light';
    var locale = node.getAttribute('data-krent-widget-locale') || 'en';
    var height = parseInt(node.getAttribute('data-krent-widget-height') || '900', 10) || 900;
    var src = BASE + '/widget/' + encodeURIComponent(agent)
      + '?view=' + encodeURIComponent(view)
      + '&theme=' + encodeURIComponent(theme)
      + '&locale=' + encodeURIComponent(locale);

    var iframe = document.createElement('iframe');
    iframe.src = src;
    iframe.loading = 'lazy';
    iframe.referrerPolicy = 'no-referrer-when-downgrade';
    iframe.style.width = '100%';
    iframe.style.border = '0';
    iframe.style.height = height + 'px';
    iframe.setAttribute('title', 'Krent properties widget');
    iframe.dataset.krentTheme = theme;
    iframe.dataset.krentView = view;
    iframe.addEventListener('error', function(){
      call('krentOnError', { agent: agent, view: view });
    });
    node.appendChild(iframe);
  }

  function init(){
    var nodes = document.querySelectorAll('[data-krent-widget-agent]');
    for (var i = 0; i < nodes.length; i++) mount(nodes[i]);
  }

  window.addEventListener('message', function(event){
    var data = event.data;
    if (!data || typeof data !== 'object' || data.source !== 'krent-widget') return;
    switch (data.type) {
      case 'ready':           call('krentOnReady', data.payload); break;
      case 'error':           call('krentOnError', data.payload); break;
      case 'property-click':  call('krentOnPropertyClick', data.payload); break;
      case 'lead-submit':     call('krentOnLeadSubmit', data.payload); break;
      case 'booking-request': call('krentOnBookingRequest', data.payload); break;
    }
  });

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
`;
}

export function buildWidgetSnippet(
  baseUrl: string,
  agentId: string,
  options?: {
    view?: (typeof WIDGET_VIEWS)[number];
    theme?: (typeof WIDGET_THEMES)[number];
    height?: number;
    locale?: string;
  },
): string {
  const safeBase = trimTrailingSlash(baseUrl);
  const view = options?.view ?? "list";
  const theme = options?.theme ?? "light";
  const height = options?.height ?? 900;
  const locale = options?.locale ?? "en";
  return [
    `<div data-krent-widget-agent="${agentId}"`,
    `     data-krent-widget-view="${view}"`,
    `     data-krent-widget-theme="${theme}"`,
    `     data-krent-widget-locale="${locale}"`,
    `     data-krent-widget-height="${height}"></div>`,
    `<script src="${safeBase}/api/public/v1/widget.js" async></script>`,
  ].join("\n");
}

function trimTrailingSlash(value: string): string {
  return value.endsWith("/") ? value.slice(0, -1) : value;
}
