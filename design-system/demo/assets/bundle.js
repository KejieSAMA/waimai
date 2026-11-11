/* @ds-bundle: {"format":4,"namespace":"Xiaozao","components":[{"name":"Icon"},{"name":"Button"},{"name":"Tag"},{"name":"Price"},{"name":"Input"},{"name":"Switch"},{"name":"Stepper"},{"name":"SearchBar"},{"name":"MobilePage"},{"name":"NavBar"},{"name":"TabBar"},{"name":"Tabs"},{"name":"CategoryNav"},{"name":"ListCell"},{"name":"Dialog"},{"name":"StatCard"},{"name":"StoreCard"},{"name":"DishCard"},{"name":"CartBar"},{"name":"OrderCard"},{"name":"ProductRow"},{"name":"MerchantRow"},{"name":"Checkbox"},{"name":"Select"},{"name":"Thumb"},{"name":"DesktopShell"},{"name":"SideNav"},{"name":"PageHeader"},{"name":"SiteHeader"},{"name":"DataTable"},{"name":"Pagination"},{"name":"FilterBar"},{"name":"InfoList"},{"name":"TrendChart"},{"name":"CartPanel"}]} */
/* 小灶 Xiaozao — mobile and desktop components for the user, merchant and admin apps. Needs window.React 18. Styles: bundle.css (xz- prefix) + tokens.css type classes. */
(function () {
  'use strict';
  var React = window.React;
  var h = React.createElement;
  var useState = React.useState;

  function cx() {
    var out = [];
    for (var i = 0; i < arguments.length; i++) if (arguments[i]) out.push(arguments[i]);
    return out.join(' ');
  }
  function omit(obj, keys) {
    var out = {};
    for (var k in obj) if (Object.prototype.hasOwnProperty.call(obj, k) && keys.indexOf(k) < 0) out[k] = obj[k];
    return out;
  }
  function useMaybeControlled(value, defaultValue, onChange) {
    var st = useState(defaultValue);
    var controlled = value !== undefined;
    return [controlled ? value : st[0], function (next) {
      if (!controlled) st[1](next);
      if (onChange) onChange(next);
    }];
  }
  function normItems(items) {
    return (items || []).map(function (it) { return typeof it === 'string' ? { key: it, label: it } : it; });
  }
  function fmtNum(v) {
    var n = Number(v);
    if (v === null || v === undefined || v === '' || isNaN(n)) return String(v == null ? '' : v);
    return String(Math.round(n * 100) / 100);
  }

  /* ---------- Icon ---------- */
  var ICONS = {
    home: ['M4 10.5 12 4l8 6.5V19a1 1 0 0 1-1 1h-4.5v-5.5h-5V20H5a1 1 0 0 1-1-1z'],
    order: ['M6 3.5h12v17l-3-2-3 2-3-2-3 2z', 'M9 8.5h6', 'M9 12h6', 'M9 15.5h3'],
    user: [{ c: [12, 8.5, 3.5] }, 'M5 20c.8-3.6 3.6-5.5 7-5.5s6.2 1.9 7 5.5'],
    store: ['M4 9.5 5.5 4.5h13L20 9.5', 'M4 9.5a2.67 2.67 0 0 0 5.33 0 2.67 2.67 0 0 0 5.34 0 2.67 2.67 0 0 0 5.33 0', 'M5.5 12v8h13v-8', 'M10 20v-4.5h4V20'],
    search: [{ c: [11, 11, 6.5] }, 'M16 16l4 4'],
    cart: ['M5 8h14l-1.2 11.1a1 1 0 0 1-1 .9H7.2a1 1 0 0 1-1-.9z', 'M9 8V6.5a3 3 0 0 1 6 0V8'],
    plus: ['M12 5v14', 'M5 12h14'],
    minus: ['M5 12h14'],
    back: ['M15 5l-7 7 7 7'],
    'chevron-right': ['M9 6l6 6-6 6'],
    'chevron-down': ['M6 9l6 6 6-6'],
    chart: ['M5 20V11', 'M12 20V4', 'M19 20v-6'],
    box: ['M4 7.5 12 4l8 3.5v9L12 20l-8-3.5z', 'M4 7.5l8 3.5 8-3.5', 'M12 11v9'],
    shield: ['M12 3.5 19 6v5.5c0 4.2-3 7.4-7 9-4-1.6-7-4.8-7-9V6z', 'M9 12l2 2 4-4'],
    bell: ['M6 16.5V11a6 6 0 0 1 12 0v5.5l1.5 2h-15z', 'M10 20.5a2 2 0 0 0 4 0'],
    settings: ['M4 7h10', 'M18 7h2', 'M4 17h4', 'M12 17h8', { c: [16, 7, 2] }, { c: [10, 17, 2] }],
    clock: [{ c: [12, 12, 8] }, 'M12 8v4.5l3 2'],
    location: ['M12 21s-6.5-6-6.5-11a6.5 6.5 0 0 1 13 0c0 5-6.5 11-6.5 11z', { c: [12, 10, 2.3] }],
    star: [{ f: 'M12 3.8l2.5 5.1 5.6.8-4 3.9 1 5.6-5.1-2.7-5 2.7 1-5.6-4.1-3.9 5.6-.8z' }],
    edit: ['M14.5 5.5l4 4L9 19H5v-4z', 'M12.5 7.5l4 4'],
    filter: ['M4 6h16l-6 7.5V19l-4 1.5v-7z'],
    more: [{ d: [6, 12] }, { d: [12, 12] }, { d: [18, 12] }],
    grid: [{ r: [4, 4, 7, 7] }, { r: [13, 4, 7, 7] }, { r: [4, 13, 7, 7] }, { r: [13, 13, 7, 7] }],
    check: ['M5 12.5l4.5 4.5L19 7.5'],
    close: ['M6 6l12 12', 'M18 6 6 18'],
    wallet: ['M4 8h15a1 1 0 0 1 1 1v10a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1z', 'M4 8l11-3.5V8', 'M16 14h1'],
    bowl: ['M3.5 11.5h17a8.5 8 0 0 1-17 0z', 'M9 8c0-1.6 1.5-1.6 1.5-3.2', 'M13.5 8c0-1.6 1.5-1.6 1.5-3.2'],
    alert: ['M12 4 21 19.5H3z', 'M12 10v4', { d: [12, 17] }],
    camera: ['M4 8.5h3l1.5-2.5h7L17 8.5h3V19H4z', { c: [12, 13.5, 3.5] }]
  };
  function Icon(p) {
    var size = p.size || 20;
    var parts = ICONS[p.name] || ICONS.more;
    var kids = parts.map(function (part, i) {
      if (typeof part === 'string') return h('path', { key: i, d: part });
      if (part.c) return h('circle', { key: i, cx: part.c[0], cy: part.c[1], r: part.c[2] });
      if (part.d) return h('circle', { key: i, cx: part.d[0], cy: part.d[1], r: 1.4, fill: 'currentColor', stroke: 'none' });
      if (part.r) return h('rect', { key: i, x: part.r[0], y: part.r[1], width: part.r[2], height: part.r[3], rx: 1.5 });
      if (part.f) return h('path', { key: i, d: part.f, fill: 'currentColor', stroke: 'none' });
      return null;
    });
    return h('svg', {
      className: cx('xz-icon', p.className), width: size, height: size, viewBox: '0 0 24 24',
      fill: 'none', stroke: 'currentColor', strokeWidth: p.strokeWidth || 1.75, strokeLinecap: 'round', strokeLinejoin: 'round',
      role: p.title ? 'img' : undefined, 'aria-hidden': p.title ? undefined : true, 'aria-label': p.title, focusable: 'false'
    }, kids);
  }
  Icon.names = Object.keys(ICONS);

  /* ---------- Button ---------- */
  var BTN_TYPE = { lg: 'title', md: 'title-sm', sm: 'body-sm' };
  function Button(p) {
    var variant = p.variant || 'primary';
    var size = p.size || 'md';
    var rest = omit(p, ['variant', 'size', 'block', 'icon', 'className', 'children']);
    return h('button', Object.assign({ type: 'button' }, rest, {
      className: cx('xz-btn', 'xz-btn--' + variant, 'xz-btn--' + size, BTN_TYPE[size], p.block && 'xz-btn--block', p.className)
    }), p.icon ? h(Icon, { name: p.icon, size: size === 'sm' ? 16 : 18 }) : null, p.children);
  }

  /* ---------- Tag ---------- */
  function Tag(p) {
    return h('span', { className: cx('xz-tag', 'caption', 'xz-tag--' + (p.variant || 'soft'), 'xz-tag--' + (p.tone || 'neutral'), p.className) },
      p.icon ? h(Icon, { name: p.icon, size: 12 }) : null, p.children);
  }

  /* ---------- Price ---------- */
  var PRICE_TYPE = { sm: 'price-sm', md: 'price', lg: 'price-lg' };
  function Price(p) {
    var size = p.size || 'md';
    return h('span', { className: cx('xz-price', 'xz-price--' + (p.tone || 'brand'), p.className) },
      h('span', { className: cx('xz-price__now', PRICE_TYPE[size]) },
        h('span', { className: 'xz-price__sym' }, '¥'), fmtNum(p.value)),
      p.original != null ? h('del', { className: 'xz-price__orig price-sm' }, '¥' + fmtNum(p.original)) : null);
  }

  /* ---------- Input ---------- */
  function Input(p) {
    var horizontal = p.layout === 'horizontal';
    var fieldProps = omit(p, ['label', 'hint', 'error', 'prefix', 'suffix', 'required', 'multiline', 'layout', 'className', 'value', 'defaultValue']);
    if (p.value !== undefined) { if (p.onChange) fieldProps.value = p.value; else fieldProps.defaultValue = p.value; }
    else if (p.defaultValue !== undefined) fieldProps.defaultValue = p.defaultValue;
    fieldProps.className = cx('xz-field__input', 'body');
    var control = h(p.multiline ? 'textarea' : 'input', Object.assign(p.multiline ? { rows: 3 } : { type: 'text' }, fieldProps));
    var msg = p.error || p.hint;
    return h('label', { className: cx('xz-field', horizontal && 'xz-field--h', p.multiline && 'xz-field--multi', p.className) },
      p.label ? h('span', { className: cx('xz-field__label', horizontal ? 'body' : 'body-sm') }, p.label,
        p.required ? h('span', { className: 'xz-field__req', 'aria-hidden': true }, '*') : null) : null,
      h('span', { className: cx('xz-field__control', p.error && 'is-error', p.multiline && 'is-multi') },
        p.prefix ? h('span', { className: 'xz-field__affix body' }, p.prefix) : null,
        control,
        p.suffix ? h('span', { className: 'xz-field__affix body' }, p.suffix) : null),
      msg ? h('span', { className: cx('xz-field__hint', 'body-sm', p.error && 'is-error') }, msg) : null);
  }

  /* ---------- Switch ---------- */
  function Switch(p) {
    var s = useMaybeControlled(p.checked, !!p.defaultChecked, p.onChange);
    var on = !!s[0];
    return h('button', {
      type: 'button', role: 'switch', 'aria-checked': on, 'aria-label': p.label ? undefined : p['aria-label'],
      disabled: p.disabled, className: cx('xz-switch', on && 'is-on', p.className),
      onClick: function () { s[1](!on); }
    },
      p.label ? h('span', { className: 'xz-switch__label body-sm' }, p.label) : null,
      h('span', { className: 'xz-switch__track' }, h('span', { className: 'xz-switch__thumb' })));
  }

  /* ---------- Stepper ---------- */
  function Stepper(p) {
    var min = p.min == null ? 0 : p.min;
    var max = p.max == null ? 99 : p.max;
    var s = useMaybeControlled(p.value, p.defaultValue == null ? min : p.defaultValue, p.onChange);
    var v = s[0];
    var collapsed = p.collapse !== false && v <= min;
    return h('span', { className: cx('xz-stepper', p.className) },
      collapsed ? null : h('button', { type: 'button', className: 'xz-stepper__btn', 'aria-label': '减少', disabled: p.disabled, onClick: function () { s[1](Math.max(min, v - 1)); } }, h(Icon, { name: 'minus', size: 14 })),
      collapsed ? null : h('span', { className: 'xz-stepper__val body', 'aria-live': 'polite' }, v),
      h('button', { type: 'button', className: 'xz-stepper__btn xz-stepper__btn--plus', 'aria-label': '增加', disabled: p.disabled || v >= max, onClick: function () { s[1](Math.min(max, v + 1)); } }, h(Icon, { name: 'plus', size: 14 })));
  }

  /* ---------- SearchBar ---------- */
  function SearchBar(p) {
    return h('div', { className: cx('xz-search', p.tone === 'brand' && 'xz-search--brand', p.className), role: 'search' },
      h('label', { className: 'xz-search__box' },
        h(Icon, { name: 'search', size: 18 }),
        h('input', { className: 'xz-search__input body-sm', type: 'search', placeholder: p.placeholder || '搜索', defaultValue: p.value, 'aria-label': p.placeholder || '搜索' })),
      p.action ? h('button', { type: 'button', className: 'xz-search__action title-sm', onClick: p.onAction }, p.action) : null);
  }

  /* ---------- MobilePage ---------- */
  function StatusIcons() {
    return h('svg', { width: 68, height: 12, viewBox: '0 0 68 12', 'aria-hidden': true, fill: 'currentColor' },
      h('rect', { x: 0, y: 8, width: 3, height: 4, rx: 1 }), h('rect', { x: 5, y: 6, width: 3, height: 6, rx: 1 }),
      h('rect', { x: 10, y: 3, width: 3, height: 9, rx: 1 }), h('rect', { x: 15, y: 0, width: 3, height: 12, rx: 1 }),
      h('path', { d: 'M31 3.2a9 9 0 0 1 11 0l-1.3 1.5a7 7 0 0 0-8.4 0zM33.5 6.2a5 5 0 0 1 6 0l-1.4 1.6a3 3 0 0 0-3.2 0zM36.5 9.2l1.5 1.8-1.5 1-1.5-1z' }),
      h('rect', { x: 46, y: 1, width: 19, height: 10, rx: 3, fill: 'none', stroke: 'currentColor', strokeOpacity: .45 }),
      h('rect', { x: 48, y: 3, width: 13, height: 6, rx: 1.5 }), h('rect', { x: 66, y: 4, width: 1.5, height: 4, rx: .75, opacity: .45 }));
  }
  function MobilePage(p) {
    var sb = p.statusBar === undefined ? 'light' : p.statusBar;
    var clear = p.bottomTone === 'clear';
    return h('div', { className: cx('xz-page', p.className) },
      sb ? h('div', { className: cx('xz-statusbar', 'xz-statusbar--' + sb), 'aria-hidden': true }, h('span', null, '9:41'), h(StatusIcons)) : null,
      p.navBar || null,
      h('div', { className: 'xz-page__body' }, p.children),
      p.bottom ? h('div', { className: cx('xz-page__bottom', clear && 'xz-page__bottom--clear') }, p.bottom) : null,
      h('div', { className: cx('xz-page__safe', (clear || !p.bottom) && 'xz-page__safe--clear') }),
      p.overlay || null);
  }

  /* ---------- NavBar ---------- */
  function NavIcon(p) {
    return h('button', { type: 'button', className: 'xz-nav__icon', 'aria-label': p.label, onClick: p.onClick },
      h(Icon, { name: p.name, size: 22 }),
      p.badge ? h('span', { className: 'xz-nav__badge caption' }, p.badge === true ? '' : p.badge) : null);
  }
  function NavBar(p) {
    var tone = p.tone || 'light';
    var left = p.back ? h(NavIcon, { name: 'back', label: '返回', onClick: p.onBack }) : (p.left || null);
    return h('header', { className: cx('xz-nav', 'xz-nav--' + tone, p.bordered !== false && tone === 'light' && 'xz-nav--bordered', p.className) },
      h('div', { className: cx('xz-nav__bar', p.align === 'left' && 'xz-nav__bar--left') },
        h('div', { className: 'xz-nav__left' }, left),
        h('div', { className: 'xz-nav__title' },
          p.title ? h('span', { className: p.align === 'left' ? 'title-lg' : 'title' }, p.title) : null,
          p.subtitle ? h('span', { className: 'xz-nav__sub caption' }, p.subtitle) : null),
        h('div', { className: 'xz-nav__right' }, p.right || null)),
      p.children ? h('div', { className: 'xz-nav__extra' }, p.children) : null);
  }
  NavBar.Icon = NavIcon;

  /* ---------- TabBar ---------- */
  var TABBAR_PRESETS = {
    user: [{ key: 'home', label: '首页', icon: 'home' }, { key: 'orders', label: '订单', icon: 'order' }, { key: 'me', label: '我的', icon: 'user' }],
    merchant: [{ key: 'desk', label: '工作台', icon: 'grid' }, { key: 'orders', label: '订单', icon: 'order' }, { key: 'products', label: '商品', icon: 'box' }, { key: 'me', label: '我的', icon: 'user' }],
    admin: [{ key: 'overview', label: '总览', icon: 'chart' }, { key: 'merchants', label: '商家', icon: 'store' }, { key: 'audit', label: '审核', icon: 'shield' }, { key: 'me', label: '我的', icon: 'user' }]
  };
  function TabBar(p) {
    var badges = p.badges || {};
    var items = (p.items || TABBAR_PRESETS[p.role || 'user']).map(function (it) {
      return badges[it.key] !== undefined ? Object.assign({}, it, { badge: badges[it.key] }) : it;
    });
    var s = useMaybeControlled(p.value, p.defaultValue || items[0].key, p.onChange);
    return h('nav', { className: cx('xz-tabbar', p.className), 'aria-label': '主导航' }, items.map(function (it) {
      var active = it.key === s[0];
      return h('button', { key: it.key, type: 'button', className: cx('xz-tabbar__item', active && 'is-active'), 'aria-current': active ? 'page' : undefined, onClick: function () { s[1](it.key); } },
        h('span', { className: 'xz-tabbar__icon' }, h(Icon, { name: it.icon, size: 22 }),
          it.badge === true ? h('span', { className: 'xz-tabbar__dot' }) : (it.badge ? h('span', { className: 'xz-tabbar__badge caption' }, it.badge) : null)),
        h('span', { className: 'xz-tabbar__label caption' }, it.label));
    }));
  }
  TabBar.presets = TABBAR_PRESETS;

  /* ---------- Tabs ---------- */
  function Tabs(p) {
    var items = normItems(p.items);
    var variant = p.variant || 'line';
    var s = useMaybeControlled(p.value, p.defaultValue || (items[0] && items[0].key), p.onChange);
    return h('div', { className: cx('xz-tabs', 'xz-tabs--' + variant, p.className), role: 'tablist' }, items.map(function (it) {
      var active = it.key === s[0];
      return h('button', { key: it.key, type: 'button', role: 'tab', 'aria-selected': active, className: cx('xz-tab', variant === 'chip' ? 'body-sm' : 'body', active && 'is-active'), onClick: function () { s[1](it.key); } },
        it.label,
        it.count != null ? h('span', { className: cx('xz-tab__count', it.alert && 'is-alert caption') }, it.count) : null);
    }));
  }

  /* ---------- CategoryNav ---------- */
  function CategoryNav(p) {
    var items = normItems(p.items);
    var s = useMaybeControlled(p.value, p.defaultValue || (items[0] && items[0].key), p.onChange);
    return h('nav', { className: cx('xz-catnav', p.className), 'aria-label': '菜品分类' }, items.map(function (it) {
      var active = it.key === s[0];
      return h('button', { key: it.key, type: 'button', className: cx('xz-catnav__item', 'body-sm', active && 'is-active'), 'aria-current': active ? 'true' : undefined, onClick: function () { s[1](it.key); } },
        it.label, it.count ? h('span', { className: 'xz-catnav__count caption' }, it.count) : null);
    }));
  }

  /* ---------- ListCell ---------- */
  function ListCell(p) {
    var clickable = !!(p.onClick || p.arrow);
    return h(clickable ? 'button' : 'div', { type: clickable ? 'button' : undefined, className: cx('xz-cell', p.danger && 'xz-cell--danger', p.className), onClick: p.onClick },
      p.icon ? h('span', { className: 'xz-cell__icon' }, h(Icon, { name: p.icon, size: 20 })) : null,
      h('span', { className: 'xz-cell__main' },
        h('span', { className: 'xz-cell__title body' }, p.title),
        p.desc ? h('span', { className: 'xz-cell__desc body-sm' }, p.desc) : null),
      p.value != null ? h('span', { className: 'xz-cell__value body-sm' }, p.value) : null,
      p.extra || null,
      p.arrow ? h('span', { className: 'xz-cell__arrow' }, h(Icon, { name: 'chevron-right', size: 16 })) : null);
  }
  function CellGroup(p) {
    return h('div', { className: cx('xz-cellgroup', p.className) },
      p.title ? h('div', { className: 'xz-cellgroup__title body-sm' }, p.title) : null,
      p.children);
  }
  ListCell.Group = CellGroup;

  /* ---------- Dialog ---------- */
  function Dialog(p) {
    if (p.open === false) return null;
    var v = p.variant || 'center';
    var sheet = v === 'sheet', drawer = v === 'drawer', wide = v === 'modal' || drawer;
    var title = p.title ? h('h2', { className: 'xz-dialog__title title' }, p.title) : null;
    return h('div', { className: cx('xz-dialog-scrim', 'xz-dialog-scrim--' + v), onClick: function (e) { if (e.target === e.currentTarget && p.onClose) p.onClose(); } },
      h('div', { className: cx('xz-dialog', 'xz-dialog--' + v, p.className), role: 'dialog', 'aria-modal': true, 'aria-label': typeof p.title === 'string' ? p.title : undefined },
        drawer ? h('div', { className: 'xz-dialog__head' }, title, h(NavIcon, { name: 'close', label: '关闭', onClick: p.onClose })) : title,
        p.children ? h('div', { className: 'xz-dialog__body body' }, p.children) : null,
        p.actions ? h('div', { className: 'xz-dialog__actions' }, p.actions.map(function (a, i) {
          return h(Button, { key: i, variant: a.variant || (i === p.actions.length - 1 ? 'primary' : 'outline'), size: sheet ? 'lg' : 'md', block: !wide, onClick: a.onClick }, a.label);
        })) : null));
  }

  /* ---------- StatCard ---------- */
  function StatCard(p) {
    var tone = p.tone || 'plain';
    var d = p.delta;
    return h('div', { className: cx('xz-stat', 'xz-stat--' + tone, p.size === 'sm' && 'xz-stat--sm', p.className) },
      h('div', { className: 'xz-stat__label body-sm' }, p.icon ? h(Icon, { name: p.icon, size: 16 }) : null, p.label),
      h('div', { className: cx('xz-stat__value', p.size === 'sm' ? 'price' : 'stat') },
        p.prefix ? h('span', { className: 'xz-stat__pre' }, p.prefix) : null, p.value,
        p.unit ? h('span', { className: 'xz-stat__unit body-sm' }, p.unit) : null),
      d != null ? h('div', { className: cx('xz-stat__delta caption', d >= 0 ? 'is-up' : 'is-down') },
        h('b', null, (d >= 0 ? '↑ ' : '↓ ') + Math.abs(d) + '%'), h('span', null, p.deltaLabel || '较昨日')) : null);
  }

  /* ---------- shared bits ---------- */
  function Logo(p) {
    return h('span', { className: cx('xz-logo', p.className), 'aria-hidden': true },
      p.src ? h('img', { src: p.src, alt: '' }) : h('span', { className: p.small ? 'title' : 'title-lg' }, String(p.name || '').slice(0, 1)));
  }
  function Img(p) {
    return h('span', { className: cx('xz-img', p.small && 'xz-img--sm', p.className) },
      p.src ? h('img', { src: p.src, alt: p.alt || '' }) : h(Icon, { name: 'bowl', size: p.small ? 24 : 32 }));
  }
  function dots(list) {
    var out = [];
    list.filter(function (x) { return x != null && x !== false && x !== ''; }).forEach(function (x, i) {
      if (i) out.push(h('span', { key: 'd' + i, className: 'xz-dot', 'aria-hidden': true }, '·'));
      out.push(h('span', { key: 'v' + i }, x));
    });
    return out;
  }

  /* ---------- StoreCard ---------- */
  function StoreCard(p) {
    var closed = p.status === 'closed';
    return h('div', { className: cx('xz-store', closed && 'is-closed', p.className), onClick: p.onClick },
      h(Logo, { src: p.logo, name: p.name }),
      h('div', { className: 'xz-store__main' },
        h('div', { className: 'xz-store__name title-sm' }, p.name),
        h('div', { className: 'xz-store__row body-sm' },
          p.rating != null ? h('span', { className: 'xz-store__rating' }, h(Icon, { name: 'star', size: 13 }), p.rating + '分') : null,
          p.sales ? h('span', null, '月售 ' + p.sales) : null,
          h('span', { className: 'xz-store__spacer' }, dots([p.time, p.distance]))),
        h('div', { className: 'xz-store__row body-sm' }, dots([
          p.minOrder != null ? '起送 ¥' + fmtNum(p.minOrder) : null,
          p.deliveryFee != null ? (Number(p.deliveryFee) === 0 ? '免配送费' : '配送 ¥' + fmtNum(p.deliveryFee)) : null])),
        closed ? h('div', { className: 'xz-store__tags' }, h(Tag, { tone: 'neutral' }, '休息中'), p.notice ? h('span', { className: 'xz-store__notice body-sm' }, p.notice) : null)
          : (p.tags && p.tags.length ? h('div', { className: 'xz-store__tags' }, p.tags.map(function (t, i) {
            return typeof t === 'string' ? h(Tag, { key: i, tone: 'brand', variant: 'outline' }, t) : h(Tag, Object.assign({ key: i }, t), t.label);
          })) : null)));
  }

  /* ---------- DishCard ---------- */
  function DishCard(p) {
    var grid = p.layout === 'grid';
    var foot = h('div', { className: 'xz-dish__foot' },
      h(Price, { value: p.price, original: p.original }),
      p.soldOut ? h(Tag, { tone: 'neutral' }, '已售罄') : h(Stepper, { defaultValue: p.count || 0, value: p.value, onChange: p.onChange, max: p.max }));
    return h('div', { className: cx('xz-dish', grid && 'xz-dish--grid', p.soldOut && 'is-soldout', p.className) },
      h(Img, { src: p.image, alt: p.name }),
      h('div', { className: 'xz-dish__main' },
        h('div', { className: 'xz-dish__name title-sm' }, p.name),
        p.desc && !grid ? h('div', { className: 'xz-dish__desc body-sm' }, p.desc) : null,
        p.sales ? h('div', { className: 'xz-dish__sales caption' }, '月售 ' + p.sales) : null,
        p.tags && p.tags.length ? h('div', { className: 'xz-dish__tags' }, p.tags.map(function (t, i) {
          return typeof t === 'string' ? h(Tag, { key: i, tone: 'brand' }, t) : h(Tag, Object.assign({ key: i }, t), t.label);
        })) : null,
        foot));
  }

  /* ---------- CartBar ---------- */
  function CartBar(p) {
    var count = p.count || 0;
    var total = Number(p.total) || 0;
    var min = Number(p.minOrder) || 0;
    var short = count > 0 && total < min;
    return h('div', { className: cx('xz-cartbar', p.className) },
      h('span', { className: cx('xz-cartbar__icon', count === 0 && 'is-empty') }, h(Icon, { name: 'cart', size: 26 }),
        count > 0 ? h('span', { className: 'xz-cartbar__badge caption' }, count) : null),
      h('div', { className: 'xz-cartbar__info' },
        count > 0 ? h(Price, { value: total, tone: 'chrome' }) : h('span', { className: 'xz-cartbar__empty body-sm' }, '未选购商品'),
        p.deliveryFee != null && count > 0 ? h('span', { className: 'xz-cartbar__sub caption' }, Number(p.deliveryFee) === 0 ? '免配送费' : '另需配送费 ¥' + fmtNum(p.deliveryFee)) : null),
      h('button', { type: 'button', className: 'xz-cartbar__go title-sm', disabled: count === 0 || short, onClick: p.onCheckout },
        count === 0 ? (min ? '¥' + fmtNum(min) + ' 起送' : (p.label || '去结算')) : (short ? '差 ¥' + fmtNum(min - total) + ' 起送' : (p.label || '去结算'))));
  }

  /* ---------- OrderCard ---------- */
  var ORDER_STATUS = {
    pending: ['待接单', 'brand'], preparing: ['备餐中', 'warning'], delivering: ['配送中', 'info'], pickup: ['待自提', 'info'],
    done: ['已完成', 'success'], cancelled: ['已取消', 'neutral'], refunding: ['退款中', 'danger']
  };
  function OrderCard(p) {
    var view = p.view || 'user';
    var st = ORDER_STATUS[p.status] || [p.status, 'neutral'];
    var items = p.items || [];
    var qty = items.reduce(function (n, it) { return n + (it.qty || 1); }, 0);
    var body;
    if (view === 'user') {
      body = h('div', { className: 'xz-order__brief' },
        h('div', { className: 'xz-order__thumbs' }, items.slice(0, 3).map(function (it, i) { return h(Img, { key: i, src: it.image, small: true }); })),
        h('span', { className: 'xz-order__brief-text body-sm' }, items.slice(0, 2).map(function (it) { return it.name; }).join('、') + (items.length > 2 ? ' 等' : '')));
    } else {
      body = h('div', { className: 'xz-order__items' }, items.map(function (it, i) {
        return h('div', { key: i, className: 'xz-order__item body-sm' },
          h('span', { className: 'xz-order__item-name' }, it.name, h('span', { className: 'xz-order__item-qty' }, '×' + (it.qty || 1))),
          it.price != null ? h('span', { className: 'xz-order__item-price' }, '¥' + fmtNum(it.price)) : null);
      }));
    }
    return h('div', { className: cx('xz-order', 'xz-order--' + view, p.className) },
      h('div', { className: 'xz-order__head' },
        h('div', { className: 'xz-order__title title-sm' },
          p.serial != null ? h('span', { className: 'xz-order__serial title' }, '#' + p.serial) : null,
          h('span', { className: 'xz-order__title-text' }, p.title),
          view === 'user' ? h(Icon, { name: 'chevron-right', size: 16, className: 'xz-order__chev' }) : null),
        h('span', { className: cx('xz-order__status body-sm', 'tone-' + st[1]) }, p.statusText || st[0])),
      p.meta ? h('div', { className: 'xz-order__meta body-sm' }, p.meta) : null,
      body,
      p.note ? h('div', { className: 'xz-order__note body-sm' }, '备注：' + p.note) : null,
      h('div', { className: 'xz-order__sum' },
        h('span', { className: 'xz-order__time body-sm' }, p.time),
        h('span', { className: 'xz-order__total' }, h('span', { className: 'xz-order__sum-label body-sm' }, '共 ' + (p.count || qty) + ' 件 · 实付'), h(Price, { value: p.total, tone: 'ink' }))),
      p.actions && p.actions.length ? h('div', { className: 'xz-order__actions' }, p.actions.map(function (a, i) {
        return h(Button, { key: i, size: 'sm', variant: a.variant || 'outline', onClick: a.onClick }, a.label);
      })) : null);
  }
  OrderCard.statuses = ORDER_STATUS;

  /* ---------- ProductRow ---------- */
  var PRODUCT_STATUS = {
    on: ['在售', 'success'], soldout: ['已售罄', 'warning'], off: ['已下架', 'neutral'], review: ['审核中', 'info'], rejected: ['审核驳回', 'danger']
  };
  function ProductRow(p) {
    var status = p.status || 'on';
    var st = PRODUCT_STATUS[status];
    var listed = status === 'on' || status === 'soldout';
    var locked = status === 'review' || status === 'rejected' || p.locked;
    var low = p.stock != null && Number(p.stock) <= (p.lowStock == null ? 5 : p.lowStock);
    return h('div', { className: cx('xz-product', p.className) },
      h('div', { className: 'xz-product__main' },
        h(Img, { src: p.image, alt: p.name, small: true }),
        h('div', { className: 'xz-product__info' },
          h('div', { className: 'xz-product__top' },
            h('span', { className: 'xz-product__name title-sm' }, p.name),
            h(Tag, { tone: st[1] }, st[0])),
          h('div', { className: 'xz-product__meta body-sm' }, dots([
            p.sales != null ? '月售 ' + p.sales : null,
            p.stock != null ? h('span', { className: low ? 'is-low' : undefined }, '库存 ' + p.stock) : null,
            p.category])),
          h(Price, { value: p.price, original: p.original, size: 'md' }))),
      p.reason ? h('div', { className: 'xz-product__reason body-sm' }, (status === 'rejected' ? '驳回原因：' : '') + p.reason) : null,
      h('div', { className: 'xz-product__actions' },
        h(Switch, { label: '上架', checked: p.onToggle ? listed : undefined, defaultChecked: listed, disabled: locked, onChange: p.onToggle }),
        h('div', { className: 'xz-product__btns' },
          h(Button, { size: 'sm', variant: 'text', icon: 'edit', onClick: p.onEdit }, status === 'rejected' ? '修改' : '编辑'),
          p.onMore ? h(Button, { size: 'sm', variant: 'text', onClick: p.onMore, 'aria-label': '更多' }, h(Icon, { name: 'more', size: 16 })) : null)));
  }
  ProductRow.statuses = PRODUCT_STATUS;

  /* ---------- MerchantRow ---------- */
  var MERCHANT_STATUS = {
    pending: ['待审核', 'warning'], open: ['营业中', 'success'], closed: ['休息中', 'neutral'], frozen: ['已冻结', 'danger'], rejected: ['已驳回', 'danger']
  };
  var MERCHANT_ACTIONS = {
    pending: [{ label: '驳回', variant: 'danger-outline' }, { label: '查看并审核', variant: 'primary' }],
    open: [{ label: '查看', variant: 'outline' }, { label: '冻结', variant: 'danger-outline' }],
    closed: [{ label: '查看', variant: 'outline' }, { label: '冻结', variant: 'danger-outline' }],
    frozen: [{ label: '查看', variant: 'outline' }, { label: '解冻', variant: 'secondary' }],
    rejected: [{ label: '查看', variant: 'outline' }]
  };
  function MerchantRow(p) {
    var status = p.status || 'open';
    var st = MERCHANT_STATUS[status];
    var actions = p.actions === undefined ? MERCHANT_ACTIONS[status] : p.actions;
    return h('div', { className: cx('xz-merchant', p.className) },
      h('div', { className: 'xz-merchant__main' },
        h(Logo, { src: p.logo, name: p.name, small: true }),
        h('div', { className: 'xz-merchant__info' },
          h('div', { className: 'xz-merchant__top' },
            h('span', { className: 'xz-merchant__name title-sm' }, p.name),
            h(Tag, { tone: st[1] }, st[0])),
          h('div', { className: 'xz-merchant__meta body-sm' }, dots([p.category, p.city, p.owner ? '负责人 ' + p.owner : null])),
          h('div', { className: 'xz-merchant__meta body-sm' }, dots([
            p.joined ? (status === 'pending' ? '提交于 ' : '入驻 ') + p.joined : null,
            p.orders != null ? '月订单 ' + p.orders : null,
            p.rating != null ? '评分 ' + p.rating : null])))),
      p.reason ? h('div', { className: 'xz-merchant__reason body-sm' }, p.reason) : null,
      actions && actions.length ? h('div', { className: 'xz-merchant__actions' }, actions.map(function (a, i) {
        return h(Button, { key: i, size: 'sm', variant: a.variant || 'outline', onClick: a.onClick }, a.label);
      })) : null);
  }
  MerchantRow.statuses = MERCHANT_STATUS;

  /* =================== Desktop =================== */
  function fmtThousands(v) {
    var n = Number(v);
    return isNaN(n) ? String(v) : n.toLocaleString('en-US');
  }

  /* ---------- Checkbox ---------- */
  function Checkbox(p) {
    var s = useMaybeControlled(p.checked, !!p.defaultChecked, p.onChange);
    var on = !!s[0];
    var mixed = !!p.indeterminate && !on;
    return h('button', {
      type: 'button', role: 'checkbox', 'aria-checked': mixed ? 'mixed' : on, 'aria-label': p.label ? undefined : p['aria-label'],
      disabled: p.disabled, className: cx('xz-check', (on || mixed) && 'is-on', p.className),
      onClick: function (e) { e.stopPropagation(); s[1](!on); }
    },
      h('span', { className: 'xz-check__box' }, on ? h(Icon, { name: 'check', size: 14, strokeWidth: 2.5 }) : (mixed ? h(Icon, { name: 'minus', size: 14, strokeWidth: 2.5 }) : null)),
      p.label ? h('span', { className: 'xz-check__label body-md' }, p.label) : null);
  }

  /* ---------- Select ---------- */
  function Select(p) {
    var opts = (p.options || []).map(function (o) { return typeof o === 'string' ? { value: o, label: o } : o; });
    var props = { className: 'xz-select__native body-md', 'aria-label': p.label || p.placeholder, disabled: p.disabled };
    if (p.value !== undefined && p.onChange) { props.value = p.value; props.onChange = function (e) { p.onChange(e.target.value); }; }
    else props.defaultValue = p.value !== undefined ? p.value : (p.defaultValue !== undefined ? p.defaultValue : (p.placeholder ? '' : (opts[0] && opts[0].value)));
    return h('label', { className: cx('xz-select', p.className), style: p.width ? { width: p.width } : undefined },
      p.label ? h('span', { className: 'xz-select__label body-md' }, p.label) : null,
      h('select', props, p.placeholder ? h('option', { value: '' }, p.placeholder) : null,
        opts.map(function (o) { return h('option', { key: o.value, value: o.value }, o.label); })),
      h(Icon, { name: 'chevron-down', size: 16, className: 'xz-select__chev' }));
  }

  /* ---------- Thumb ---------- */
  function Thumb(p) {
    var size = p.size || 'md';
    return p.kind === 'logo'
      ? h(Logo, { src: p.src, name: p.name, small: true, className: 'xz-thumb xz-thumb--' + size })
      : h(Img, { src: p.src, alt: p.name, small: true, className: 'xz-thumb xz-thumb--' + size });
  }

  /* ---------- SideNav ---------- */
  var SIDENAV_PRESETS = {
    merchant: [
      { items: [{ key: 'desk', label: '工作台', icon: 'grid' }, { key: 'orders', label: '订单', icon: 'order' }, { key: 'products', label: '商品管理', icon: 'box' }] },
      { title: '经营', items: [{ key: 'data', label: '经营数据', icon: 'chart' }, { key: 'reviews', label: '评价管理', icon: 'star' }, { key: 'finance', label: '账户与结算', icon: 'wallet' }] },
      { title: '店铺', items: [{ key: 'store', label: '店铺设置', icon: 'store' }, { key: 'hours', label: '营业时间', icon: 'clock' }] }
    ],
    admin: [
      { items: [{ key: 'overview', label: '数据总览', icon: 'chart' }] },
      { title: '商家', items: [{ key: 'merchants', label: '商家管理', icon: 'store' }, { key: 'audit', label: '入驻审核', icon: 'shield' }] },
      { title: '交易', items: [{ key: 'products', label: '商品巡检', icon: 'box' }, { key: 'orders', label: '订单监管', icon: 'order' }, { key: 'disputes', label: '退款纠纷', icon: 'alert' }] },
      { title: '平台', items: [{ key: 'categories', label: '类目管理', icon: 'grid' }, { key: 'notices', label: '平台公告', icon: 'bell' }, { key: 'accounts', label: '账号与权限', icon: 'user' }] }
    ]
  };
  function SideNav(p) {
    var role = p.role || 'merchant';
    var groups = p.groups || SIDENAV_PRESETS[role] || SIDENAV_PRESETS.merchant;
    var badges = p.badges || {};
    var first = groups[0] && groups[0].items[0] && groups[0].items[0].key;
    var s = useMaybeControlled(p.value, p.defaultValue || first, p.onChange);
    return h('nav', { className: cx('xz-sidenav', role === 'admin' && 'xz-sidenav--admin', p.brand === false && 'xz-sidenav--plain', p.className), 'aria-label': p['aria-label'] || '主导航' },
      p.brand === false ? null : h('div', { className: 'xz-sidenav__brand' },
        h('span', { className: 'title' }, p.brand || '小灶'),
        h('span', { className: 'xz-sidenav__sub caption' }, p.subtitle || (role === 'admin' ? '运营后台' : '商家中心'))),
      h('div', { className: 'xz-sidenav__groups' }, groups.map(function (g, gi) {
        return h('div', { key: gi, className: 'xz-sidenav__group' },
          g.title ? h('div', { className: 'xz-sidenav__title caption' }, g.title) : null,
          g.items.map(function (it) {
            var active = it.key === s[0];
            var b = badges[it.key] !== undefined ? badges[it.key] : it.badge;
            return h('button', { key: it.key, type: 'button', title: it.label, className: cx('xz-sidenav__item', active && 'is-active'), 'aria-current': active ? 'page' : undefined, onClick: function () { s[1](it.key); } },
              it.icon ? h(Icon, { name: it.icon, size: 20 }) : null,
              h('span', { className: 'xz-sidenav__label body-md' }, it.label),
              b ? h('span', { className: 'xz-sidenav__badge caption' }, b === true ? '' : b) : null);
          }));
      })),
      p.footer ? h('div', { className: 'xz-sidenav__footer' }, p.footer) : null);
  }
  SideNav.presets = SIDENAV_PRESETS;

  /* ---------- DesktopShell ---------- */
  function DesktopShell(p) {
    var role = p.role || 'merchant';
    return h('div', { className: cx('xz-shell', 'xz-desk', 'xz-shell--' + role, p.className) },
      h(SideNav, Object.assign({ role: role }, p.nav || {})),
      h('div', { className: 'xz-shell__main' },
        h('header', { className: 'xz-topbar' },
          h('div', { className: 'xz-topbar__left' }, p.topLeft || (p.search ? h(SearchBar, { placeholder: p.search }) : null)),
          h('div', { className: 'xz-topbar__right' },
            p.topRight || null,
            h(NavIcon, { name: 'bell', label: '消息', badge: p.notices }),
            p.user ? h('span', { className: 'xz-topbar__user' },
              h(Logo, { name: p.user.name, small: true, className: 'xz-topbar__avatar' }),
              h('span', { className: 'xz-topbar__who' }, h('span', { className: 'body-md' }, p.user.name),
                p.user.role ? h('span', { className: 'xz-topbar__role caption' }, p.user.role) : null)) : null)),
        h('main', { className: 'xz-shell__content' }, p.children)),
      p.overlay || null);
  }

  /* ---------- PageHeader ---------- */
  function PageHeader(p) {
    return h('div', { className: cx('xz-pagehead', p.className) },
      p.breadcrumb ? h('div', { className: 'xz-pagehead__crumbs caption' }, p.breadcrumb.map(function (c, i) {
        return h(React.Fragment, { key: i }, i ? h('span', { 'aria-hidden': true }, '/') : null, h('span', { className: i === p.breadcrumb.length - 1 ? 'is-current' : undefined }, c));
      })) : null,
      h('div', { className: 'xz-pagehead__row' },
        h('div', { className: 'xz-pagehead__titles' },
          p.back ? h(NavIcon, { name: 'back', label: '返回', onClick: p.onBack }) : null,
          h('h1', { className: 'xz-pagehead__title title-lg' }, p.title),
          p.tag || null,
          p.subtitle ? h('span', { className: 'xz-pagehead__sub body-md' }, p.subtitle) : null),
        p.actions ? h('div', { className: 'xz-pagehead__actions' }, p.actions) : null),
      p.children ? h('div', { className: 'xz-pagehead__extra' }, p.children) : null);
  }

  /* ---------- SiteHeader ---------- */
  function SiteHeader(p) {
    var links = normItems(p.links || [{ key: 'home', label: '首页' }, { key: 'orders', label: '我的订单' }]);
    var s = useMaybeControlled(p.value, p.defaultValue || links[0].key, p.onChange);
    return h('header', { className: cx('xz-site', p.className) },
      h('div', { className: 'xz-site__inner' },
        h('span', { className: 'xz-site__brand title-lg' }, p.brand || '小灶'),
        h('button', { type: 'button', className: 'xz-site__place body-md' }, h(Icon, { name: 'location', size: 18 }), p.location || '选择收货地址', h(Icon, { name: 'chevron-down', size: 16 })),
        h(SearchBar, { tone: 'brand', placeholder: p.search || '搜索店铺、菜品', action: '搜索', className: 'xz-site__search' }),
        h('nav', { className: 'xz-site__links', 'aria-label': '网站导航' }, links.map(function (l) {
          var active = l.key === s[0];
          return h('button', { key: l.key, type: 'button', className: cx('xz-site__link body-md', active && 'is-active'), 'aria-current': active ? 'page' : undefined, onClick: function () { s[1](l.key); } }, l.label);
        })),
        h('button', { type: 'button', className: 'xz-site__cart', 'aria-label': '购物车' }, h(Icon, { name: 'cart', size: 22 }),
          p.cartCount ? h('span', { className: 'xz-site__badge caption' }, p.cartCount) : null),
        p.user ? h('span', { className: 'xz-site__user body-md' }, h(Logo, { name: p.user.name, small: true, className: 'xz-site__avatar' }), p.user.name)
          : h(Button, { variant: 'secondary', size: 'sm' }, '登录')));
  }

  /* ---------- DataTable ---------- */
  function TableMedia(p) {
    return h('span', { className: 'xz-cell-media' },
      h(Thumb, { src: p.src, name: p.name, kind: p.kind }),
      h('span', { className: 'xz-cell-media__text' },
        h('span', { className: 'xz-cell-media__name body-md' }, p.name),
        p.sub ? h('span', { className: 'xz-cell-media__sub caption' }, p.sub) : null));
  }
  function DataTable(p) {
    var cols = p.columns || [];
    var rows = p.rows || [];
    var keyOf = function (r, i) { return p.rowKey ? r[p.rowKey] : i; };
    var sel = useMaybeControlled(p.selected, p.defaultSelected || [], p.onSelect);
    var selected = sel[0] || [];
    var keys = rows.map(keyOf);
    var allOn = keys.length > 0 && keys.every(function (k) { return selected.indexOf(k) >= 0; });
    var some = !allOn && keys.some(function (k) { return selected.indexOf(k) >= 0; });
    function toggle(k) { sel[1](selected.indexOf(k) >= 0 ? selected.filter(function (x) { return x !== k; }) : selected.concat([k])); }
    var span = cols.length + (p.selectable ? 1 : 0);
    return h('div', { className: cx('xz-table', p.className) },
      p.toolbar ? h('div', { className: 'xz-table__toolbar' }, p.toolbar) : null,
      p.selectable && selected.length && p.batchActions ? h('div', { className: 'xz-table__batch body-md' },
        h('span', { className: 'xz-table__count' }, '已选 ' + selected.length + ' 项'),
        p.batchActions.map(function (a, i) { return h(Button, { key: i, size: 'sm', variant: a.variant || 'outline', onClick: a.onClick }, a.label); }),
        h(Button, { size: 'sm', variant: 'text', onClick: function () { sel[1]([]); } }, '取消选择')) : null,
      h('div', { className: 'xz-table__scroll' },
        h('table', null,
          h('thead', null, h('tr', null,
            p.selectable ? h('th', { className: 'xz-table__sel' }, h(Checkbox, { checked: allOn, indeterminate: some, 'aria-label': '全选', onChange: function () { sel[1](allOn ? [] : keys); } })) : null,
            cols.map(function (c) { return h('th', { key: c.key, className: 'body-sm', style: { width: c.width, textAlign: c.align || 'left' } }, c.title); }))),
          h('tbody', null, rows.length ? rows.map(function (r, i) {
            var k = keyOf(r, i);
            var on = selected.indexOf(k) >= 0;
            return h('tr', { key: k, className: cx(on && 'is-selected', p.activeKey === k && 'is-active', p.onRowClick && 'is-clickable'), onClick: p.onRowClick ? function () { p.onRowClick(r); } : undefined },
              p.selectable ? h('td', { className: 'xz-table__sel' }, h(Checkbox, { checked: on, 'aria-label': '选择此行', onChange: function () { toggle(k); } })) : null,
              cols.map(function (c) { return h('td', { key: c.key, className: cx('body-md', c.num && 'xz-num'), style: { textAlign: c.align || 'left' } }, c.render ? c.render(r, i) : r[c.key]); }));
          }) : h('tr', null, h('td', { colSpan: span, className: 'xz-table__empty body-md' }, p.empty || '暂无数据'))))),
      p.footer ? h('div', { className: 'xz-table__foot' }, p.footer) : null);
  }
  DataTable.Media = TableMedia;

  /* ---------- Pagination ---------- */
  function Pagination(p) {
    var size = p.pageSize || 20;
    var pages = Math.max(1, Math.ceil((p.total || 0) / size));
    var s = useMaybeControlled(p.page, p.defaultPage || 1, p.onChange);
    var cur = s[0];
    var list = [];
    function add(n) { if (n >= 1 && n <= pages && list.indexOf(n) < 0) list.push(n); }
    add(1); add(cur - 1); add(cur); add(cur + 1); add(pages);
    list.sort(function (a, b) { return a - b; });
    var out = [];
    list.forEach(function (n, i) { if (i && n - list[i - 1] > 1) out.push('gap' + i); out.push(n); });
    return h('nav', { className: cx('xz-pager body-md', p.className), 'aria-label': '分页' },
      h('span', { className: 'xz-pager__total' }, '共 ' + fmtThousands(p.total || 0) + ' 条'),
      h('button', { type: 'button', className: 'xz-pager__btn', 'aria-label': '上一页', disabled: cur <= 1, onClick: function () { s[1](cur - 1); } }, h(Icon, { name: 'back', size: 16 })),
      out.map(function (n) {
        return typeof n === 'string' ? h('span', { key: n, className: 'xz-pager__gap', 'aria-hidden': true }, '…')
          : h('button', { key: n, type: 'button', className: cx('xz-pager__btn', n === cur && 'is-active'), 'aria-current': n === cur ? 'page' : undefined, onClick: function () { s[1](n); } }, n);
      }),
      h('button', { type: 'button', className: 'xz-pager__btn', 'aria-label': '下一页', disabled: cur >= pages, onClick: function () { s[1](cur + 1); } }, h(Icon, { name: 'chevron-right', size: 16 })));
  }

  /* ---------- FilterBar ---------- */
  function FilterBar(p) {
    return h('div', { className: cx('xz-filterbar', p.className), role: 'search' },
      p.children,
      h('div', { className: 'xz-filterbar__btns' },
        h(Button, { variant: 'outline', onClick: p.onReset }, '重置'),
        h(Button, { onClick: p.onSearch }, '查询')));
  }

  /* ---------- InfoList ---------- */
  function InfoList(p) {
    return h('dl', { className: cx('xz-info', p.columns === 2 && 'xz-info--2', p.className) }, (p.items || []).map(function (it, i) {
      return h('div', { key: i, className: 'xz-info__row' },
        h('dt', { className: 'xz-info__label body-md' }, it.label),
        h('dd', { className: 'xz-info__value body-md' }, it.value));
    }));
  }

  /* ---------- CartPanel ---------- */
  function CartPanel(p) {
    var items = p.items || [];
    var count = items.reduce(function (n, it) { return n + (it.qty || 1); }, 0);
    var sub = items.reduce(function (n, it) { return n + it.price * (it.qty || 1); }, 0);
    var fee = Number(p.deliveryFee) || 0;
    var off = Number(p.discount) || 0;
    var min = Number(p.minOrder) || 0;
    var short = count > 0 && sub < min;
    var label = count === 0 ? (min ? '¥' + fmtNum(min) + ' 起送' : (p.label || '去结算')) : (short ? '差 ¥' + fmtNum(min - sub) + ' 起送' : (p.label || '去结算'));
    return h('aside', { className: cx('xz-cartpanel', p.className), 'aria-label': '购物车' },
      h('div', { className: 'xz-cartpanel__head' }, h('span', { className: 'title' }, '购物车'),
        count ? h(Button, { variant: 'text', size: 'sm', onClick: p.onClear }, '清空') : null),
      count ? h('div', { className: 'xz-cartpanel__list' }, items.map(function (it, i) {
        return h('div', { key: i, className: 'xz-cartpanel__item' },
          h('span', { className: 'xz-cartpanel__name' }, h('span', { className: 'body-md' }, it.name), it.spec ? h('span', { className: 'xz-cartpanel__spec caption' }, it.spec) : null),
          h(Stepper, { defaultValue: it.qty || 1, collapse: false }),
          h(Price, { value: it.price * (it.qty || 1), size: 'sm', tone: 'ink' }));
      })) : h('div', { className: 'xz-cartpanel__empty body-md' }, h(Icon, { name: 'cart', size: 32 }), '还没有选购商品'),
      count ? h('div', { className: 'xz-cartpanel__sum body-md' },
        h('div', null, h('span', null, '商品小计'), h('span', { className: 'xz-num' }, '¥' + fmtNum(sub))),
        h('div', null, h('span', null, '配送费'), h('span', { className: 'xz-num' }, fee ? '¥' + fmtNum(fee) : '免配送费')),
        off ? h('div', { className: 'is-off' }, h('span', null, p.discountLabel || '满减优惠'), h('span', { className: 'xz-num' }, '-¥' + fmtNum(off))) : null) : null,
      h('div', { className: 'xz-cartpanel__foot' },
        count ? h('div', { className: 'xz-cartpanel__total' }, h('span', { className: 'body-md' }, '合计'), h(Price, { value: Math.max(0, sub + fee - off), size: 'lg' })) : null,
        h(Button, { size: 'lg', block: true, disabled: count === 0 || short, onClick: p.onCheckout }, label)));
  }

  /* ---------- TrendChart ---------- */
  function niceStep(max, n) {
    var raw = max / n;
    var mag = Math.pow(10, Math.floor(Math.log(raw) / Math.LN10));
    var r = raw / mag;
    return (r <= 1 ? 1 : r <= 2 ? 2 : r <= 2.5 ? 2.5 : r <= 5 ? 5 : 10) * mag;
  }
  function compactCN(v) {
    if (v >= 1e8) return +(v / 1e8).toFixed(1) + '亿';
    if (v >= 1e4) return +(v / 1e4).toFixed(1) + '万';
    return fmtThousands(v);
  }
  function TrendChart(p) {
    var data = p.data || [];
    var H = p.height || 240;
    var ref = React.useRef(null);
    var ws = useState(p.width || 640);
    var W = ws[0];
    React.useEffect(function () {
      var el = ref.current;
      if (!el || typeof ResizeObserver === 'undefined') return undefined;
      var ro = new ResizeObserver(function (es) { var w = Math.round(es[0].contentRect.width); if (w > 0) ws[1](w); });
      ro.observe(el);
      return function () { ro.disconnect(); };
    }, []);
    var hv = useState(null);
    var hi = hv[0];
    var padL = 44, padR = 8, padT = 20, padB = 26;
    var iw = Math.max(10, W - padL - padR), ih = H - padT - padB;
    var max = 0;
    data.forEach(function (d) { if (d.value > max) max = d.value; });
    var step = niceStep(max || 1, 4);
    var top = Math.ceil((max || 1) / step) * step;
    var ticks = [];
    for (var t = 0; t <= top + step / 1000; t += step) ticks.push(t);
    var band = iw / Math.max(1, data.length);
    var bw = Math.min(24, Math.max(4, band - 8));
    var y = function (v) { return padT + ih - (v / top) * ih; };
    var full = p.valueFormat || function (v) { return (p.prefix || '') + fmtThousands(v) + (p.unit || ''); };
    var tick = p.tickFormat || compactCN;
    var base = padT + ih;
    function barPath(x, v) {
      var yy = y(v), hgt = base - yy, r = Math.min(4, hgt, bw / 2);
      if (hgt <= 0) return '';
      return 'M' + x + ' ' + base + 'V' + (yy + r) + 'Q' + x + ' ' + yy + ' ' + (x + r) + ' ' + yy + 'H' + (x + bw - r) + 'Q' + (x + bw) + ' ' + yy + ' ' + (x + bw) + ' ' + (yy + r) + 'V' + base + 'Z';
    }
    var last = data.length - 1;
    var tipX = hi != null ? padL + hi * band + band / 2 : 0;
    return h('figure', { className: cx('xz-chart', p.className) },
      p.title ? h('figcaption', { className: 'xz-chart__title' }, h('span', { className: 'title-sm' }, p.title),
        p.subtitle ? h('span', { className: 'xz-chart__sub body-sm' }, p.subtitle) : null) : null,
      h('div', { className: 'xz-chart__plot', ref: ref, style: { height: H } },
        h('svg', { width: W, height: H, role: 'img', 'aria-label': (p.title || '趋势') + '，柱状图' },
          ticks.map(function (tv, i) {
            return h('g', { key: 'g' + i },
              h('line', { className: 'xz-chart__grid', x1: padL, x2: W - padR, y1: Math.round(y(tv)) + .5, y2: Math.round(y(tv)) + .5 }),
              h('text', { className: 'xz-chart__tick', x: padL - 8, y: y(tv) + 4, textAnchor: 'end' }, tick(tv)));
          }),
          data.map(function (d, i) {
            var x = padL + i * band + (band - bw) / 2;
            return h('g', { key: 'b' + i },
              h('path', { className: cx('xz-chart__bar', hi === i && 'is-hover'), d: barPath(x, d.value) }),
              h('text', { className: 'xz-chart__tick', x: padL + i * band + band / 2, y: H - 6, textAnchor: 'middle' }, d.label),
              h('rect', {
                className: 'xz-chart__hit', x: padL + i * band, y: padT, width: band, height: ih, tabIndex: 0,
                'aria-label': d.label + ' ' + full(d.value),
                onMouseEnter: function () { hv[1](i); }, onMouseLeave: function () { hv[1](null); },
                onFocus: function () { hv[1](i); }, onBlur: function () { hv[1](null); }
              }));
          }),
          last >= 0 && hi == null ? h('text', { className: 'xz-chart__value', x: padL + last * band + band / 2, y: y(data[last].value) - 6, textAnchor: 'middle' }, tick(data[last].value)) : null),
        hi != null ? h('div', { className: 'xz-chart__tip', style: { left: tipX, top: y(data[hi].value) - 8 } },
          h('b', { className: 'title-sm' }, full(data[hi].value)), h('span', { className: 'caption' }, data[hi].label)) : null),
      h('div', { className: 'xz-sr' }, h('table', null, h('caption', null, p.title || '数据'),
        h('tbody', null, data.map(function (d, i) { return h('tr', { key: i }, h('th', null, d.label), h('td', null, full(d.value))); })))));
  }

  var api = {
    Icon: Icon, Button: Button, Tag: Tag, Price: Price, Input: Input, Switch: Switch, Stepper: Stepper, SearchBar: SearchBar,
    MobilePage: MobilePage, NavBar: NavBar, TabBar: TabBar, Tabs: Tabs, CategoryNav: CategoryNav, ListCell: ListCell, Dialog: Dialog,
    StatCard: StatCard, StoreCard: StoreCard, DishCard: DishCard, CartBar: CartBar, OrderCard: OrderCard, ProductRow: ProductRow, MerchantRow: MerchantRow,
    Checkbox: Checkbox, Select: Select, Thumb: Thumb, DesktopShell: DesktopShell, SideNav: SideNav, PageHeader: PageHeader, SiteHeader: SiteHeader,
    DataTable: DataTable, Pagination: Pagination, FilterBar: FilterBar, InfoList: InfoList, TrendChart: TrendChart, CartPanel: CartPanel
  };
  window.Xiaozao = Object.assign(window.Xiaozao || {}, api);
})();
