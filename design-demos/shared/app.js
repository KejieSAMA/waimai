// 三套方案共用的页面。差异来自 window.DEMO_STYLE：antd token、深浅算法和少量布局开关。
(function () {
  const { createApp, ref, reactive, computed, watch, onMounted, onBeforeUnmount } = Vue;
  const S = window.DEMO_STYLE;
  const { categories, stores, menuOf } = window.DEMO_DATA;
  const { theme, message } = antd;

  // ---------- 工具 ----------
  const yuan = (fen) => "¥" + (fen / 100).toFixed(2).replace(/\.?0+$/, "");
  const sales = (n) => (n >= 1000 ? `月售 ${Math.floor(n / 100) * 100}+` : `月售 ${n}`);
  const storage = {
    get(k) {
      try {
        return localStorage.getItem(k);
      } catch {
        return null;
      }
    },
    set(k, v) {
      try {
        localStorage.setItem(k, v);
      } catch {
        /* 无痕模式下忽略 */
      }
    },
  };

  // ---------- 全局状态 ----------
  const parseRoute = () => {
    const m = location.hash.match(/^#\/store\/(s\d+)/);
    return m && stores.some((s) => s.id === m[1]) ? { name: "store", id: m[1] } : { name: "home" };
  };
  const state = reactive({
    dark: storage.get(`demo-dark-${S.key}`) === "1",
    route: parseRoute(),
    cart: {}, // { storeId: { dishId: qty } }
  });
  window.addEventListener("hashchange", () => {
    // 文档本身不滚动；切换视图时组件重新挂载，各自的滚动容器从顶部开始
    state.route = parseRoute();
  });
  const go = (hash) => {
    location.hash = hash;
  };
  const qtyOf = (storeId, dishId) => state.cart[storeId]?.[dishId] || 0;
  const setQty = (storeId, dishId, qty) => {
    const bag = { ...(state.cart[storeId] || {}) };
    if (qty > 0) bag[dishId] = qty;
    else delete bag[dishId];
    state.cart = { ...state.cart, [storeId]: bag };
  };
  const cartCount = computed(() =>
    Object.values(state.cart).reduce((sum, bag) => sum + Object.values(bag).reduce((a, b) => a + b, 0), 0),
  );

  // 色块封面：用色相生成扁平底色和首字颜色
  const coverStyle = (hue) => {
    const c = S.cover[state.dark ? "dark" : "light"];
    return {
      background: `hsl(${hue} ${c.s}% ${c.l}%)`,
      color: `hsl(${hue} ${c.ts}% ${c.tl}%)`,
    };
  };

  // ---------- 图标（线性，24 网格） ----------
  const ICONS = {
    search: ["M11 19a8 8 0 1 0 0-16 8 8 0 0 0 0 16z", "M21 21l-4.35-4.35"],
    pin: ["M12 21s-7-6.2-7-11.5a7 7 0 0 1 14 0C19 14.8 12 21 12 21z", "M12 12.5a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5z"],
    bag: ["M6 7h12l1 13H5L6 7z", "M9 7V6a3 3 0 0 1 6 0v1"],
    sun: [
      "M12 16a4 4 0 1 0 0-8 4 4 0 0 0 0 8z",
      "M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4",
    ],
    moon: ["M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z"],
    clock: ["M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18z", "M12 7v5l3 2"],
    down: ["M6 9l6 6 6-6"],
    left: ["M15 18l-6-6 6-6"],
    plus: ["M12 5v14M5 12h14"],
    minus: ["M5 12h14"],
    bell: ["M18 8a6 6 0 1 0-12 0c0 7-3 9-3 9h18s-3-2-3-9", "M13.7 21a2 2 0 0 1-3.4 0"],
    user: ["M20 21a8 8 0 0 0-16 0", "M12 13a5 5 0 1 0 0-10 5 5 0 0 0 0 10z"],
    trash: ["M3 6h18", "M8 6V4h8v2", "M6 6l1 14h10l1-14"],
  };
  const Ico = {
    props: { name: String, size: { type: Number, default: 18 } },
    template: `<svg class="ico" :width="size" :height="size" viewBox="0 0 24 24" fill="none" stroke="currentColor"
      stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
      <path v-for="d in paths" :key="d" :d="d"/></svg>`,
    computed: {
      paths() {
        return ICONS[this.name] || [];
      },
    },
  };

  // ---------- 覆盖式滚动区（对应 packages/ui 的 ScrollArea + ScrollBars） ----------
  // 原生滚动条隐藏，细滑块绝对定位在视口上方，不占宽度：内容是否溢出都不会改变布局。
  const ScrollArea = {
    // placement="outside"：滑块放到容器右侧间距里，不压在内容上（同产品 scrollbar-placement="outside"）
    props: {
      label: { type: String, default: "滚动内容" },
      contentClass: [String, Array, Object],
      placement: { type: String, default: "inside" },
    },
    emits: ["scroll"],
    setup(props, { emit, expose }) {
      const viewport = ref();
      const content = ref();
      const bar = reactive({ show: false, size: 0, top: 0, dragging: false });
      const update = () => {
        const v = viewport.value;
        if (!v) return;
        const max = v.scrollHeight - v.clientHeight;
        bar.show = max > 1;
        if (!bar.show) return;
        bar.size = Math.max(24, (v.clientHeight * v.clientHeight) / v.scrollHeight);
        bar.top = (v.scrollTop / max) * (v.clientHeight - bar.size);
      };
      const onScroll = (e) => {
        update();
        emit("scroll", e);
      };
      let observer;
      onMounted(() => {
        observer = new ResizeObserver(update);
        observer.observe(viewport.value);
        observer.observe(content.value);
        update();
      });
      onBeforeUnmount(() => observer?.disconnect());
      // 拖动滑块
      const drag = (e) => {
        const v = viewport.value;
        const startY = e.clientY;
        const startTop = v.scrollTop;
        const ratio = (v.scrollHeight - v.clientHeight) / Math.max(1, v.clientHeight - bar.size);
        bar.dragging = true;
        e.currentTarget.setPointerCapture(e.pointerId);
        const move = (ev) => (v.scrollTop = startTop + (ev.clientY - startY) * ratio);
        const up = (ev) => {
          bar.dragging = false;
          ev.currentTarget.removeEventListener("pointermove", move);
          ev.currentTarget.removeEventListener("pointerup", up);
        };
        e.currentTarget.addEventListener("pointermove", move);
        e.currentTarget.addEventListener("pointerup", up);
      };
      expose({ viewport, scrollTo: (o) => viewport.value?.scrollTo(o) });
      return { viewport, content, bar, onScroll, drag };
    },
    template: `
      <div class="sa" :class="{ 'sa--outside': placement === 'outside' }">
        <div ref="viewport" class="sa-viewport" tabindex="0" role="region" :aria-label="label" @scroll.passive="onScroll">
          <div ref="content" class="sa-content" :class="contentClass"><slot/></div>
        </div>
        <div v-show="bar.show" class="sa-bar" aria-hidden="true">
          <div class="sa-thumb" :class="{ dragging: bar.dragging }"
            :style="{ height: bar.size + 'px', transform: 'translateY(' + bar.top + 'px)' }" @pointerdown.prevent="drag"></div>
        </div>
      </div>`,
  };

  // ---------- 数量步进 ----------
  const QtyStepper = {
    props: { storeId: String, dish: Object },
    setup(props) {
      const qty = computed(() => qtyOf(props.storeId, props.dish.id));
      const change = (d) => setQty(props.storeId, props.dish.id, Math.max(0, qty.value + d));
      return { qty, change, S };
    },
    template: `
      <a-tag v-if="dish.soldOut" class="tag-flat">已售罄</a-tag>
      <a-button v-else-if="qty === 0" type="primary" :shape="S.stepShape" size="small" class="add-btn"
        :aria-label="'加入 ' + dish.name" @click.stop="change(1)"><ico name="plus" :size="14"/></a-button>
      <div v-else class="stepper" @click.stop>
        <a-button :shape="S.stepShape" size="small" :aria-label="'减少 ' + dish.name" @click="change(-1)"><ico name="minus" :size="14"/></a-button>
        <span class="stepper-num num">{{ qty }}</span>
        <a-button type="primary" :shape="S.stepShape" size="small" :aria-label="'增加 ' + dish.name" @click="change(1)"><ico name="plus" :size="14"/></a-button>
      </div>`,
  };

  // ---------- 顶栏 ----------
  const SiteHeader = {
    setup() {
      const keyword = ref("");
      const address = ref("望京 SOHO");
      const addresses = ["望京 SOHO", "中关村软件园", "国贸三期"];
      const search = () => {
        go("#/");
        message.info(keyword.value ? `搜索“${keyword.value}”（演示）` : "请输入店铺或菜品");
      };
      const toggleDark = () => {
        state.dark = !state.dark;
        storage.set(`demo-dark-${S.key}`, state.dark ? "1" : "0");
      };
      return {
        S, state, keyword, address, addresses, search, toggleDark, cartCount, go,
        notReady: () => message.info("演示未包含该页面"),
      };
    },
    template: `
      <header class="site-header" :class="['header-' + S.layout.header, { 'header-centered': S.layout.searchCenter }]">
        <!-- 左 / 中 / 右三区：居中方案里左右两区等宽，搜索框位置不受地址长短影响 -->
        <div class="wrap header-inner">
          <div class="header-left">
            <a class="logo" href="#/" aria-label="盟信首页"><span class="logo-mark">盟</span><span class="logo-text">盟信外卖</span></a>
            <a-dropdown :trigger="['click']">
              <button class="addr" type="button" :title="address"><ico name="pin" :size="16"/><span class="addr-text">{{ address }}</span><ico name="down" :size="14"/></button>
              <template #overlay>
                <a-menu :selected-keys="[address]" @click="({ key }) => (address = key)"
                  :items="addresses.map(a => ({ key: a, label: a }))"/>
              </template>
            </a-dropdown>
          </div>
          <div v-if="!S.layout.hero || state.route.name !== 'home'" class="header-search">
            <a-input-search v-model:value="keyword" placeholder="搜索店铺或菜品" allow-clear @search="search"/>
          </div>
          <div v-else class="header-spacer"></div>
          <div class="header-right">
          <nav class="header-nav" aria-label="主导航">
            <a href="#/" :class="{ active: state.route.name === 'home' }">首页</a>
            <a href="javascript:void 0" @click="notReady">我的订单</a>
          </nav>
          <div class="header-actions">
            <a-tooltip :title="state.dark ? '切换浅色' : '切换深色'">
              <button class="icon-btn" type="button" :aria-label="state.dark ? '切换浅色' : '切换深色'" @click="toggleDark">
                <ico :name="state.dark ? 'sun' : 'moon'"/>
              </button>
            </a-tooltip>
            <a-badge :count="cartCount" :offset="[-4, 4]" size="small">
              <button class="icon-btn" type="button" aria-label="购物车" @click="notReady"><ico name="bag"/></button>
            </a-badge>
            <a-button :type="S.layout.header === 'light' ? 'primary' : 'default'" :shape="S.buttonShape" class="login-btn" @click="notReady">登录</a-button>
          </div>
          </div>
        </div>
      </header>`,
  };

  // ---------- 首页 ----------
  const HomePage = {
    setup() {
      const category = ref("全部");
      const sort = ref("default");
      const openOnly = ref(false);
      const freeDelivery = ref(false);
      const page = ref(1);
      const pageSize = S.layout.pageSize;
      const heroKeyword = ref("");

      const filtered = computed(() => {
        let list = stores.filter(
          (s) =>
            (category.value === "全部" || s.category === category.value) &&
            (!openOnly.value || s.status === "营业中") &&
            (!freeDelivery.value || s.deliveryFee === 0),
        );
        if (sort.value === "sales") list = [...list].sort((a, b) => b.monthlySales - a.monthlySales);
        if (sort.value === "minOrder") list = [...list].sort((a, b) => a.minOrder - b.minOrder);
        if (sort.value === "rating") list = [...list].sort((a, b) => b.rating - a.rating);
        // 营业中的店铺排在前面
        return [...list].sort((a, b) => (a.status === "营业中" ? 0 : 1) - (b.status === "营业中" ? 0 : 1));
      });
      const paged = computed(() => filtered.value.slice((page.value - 1) * pageSize, page.value * pageSize));
      // 唯一滚动容器：顶栏与底部分页都在它之外，始终可见
      const scroller = ref();
      const toTop = () => scroller.value?.scrollTo({ top: 0 });
      watch([category, sort, openOnly, freeDelivery], () => {
        page.value = 1;
        toTop();
      });
      watch(page, toTop);
      const reset = () => {
        category.value = "全部";
        openOnly.value = false;
        freeDelivery.value = false;
      };
      const open = (s) => go(`#/store/${s.id}`);
      const columns = [
        { title: "店铺", key: "store" },
        { title: "评分", key: "rating", width: 90, align: "right" },
        { title: "月售", key: "sales", width: 110, align: "right" },
        { title: "起送", key: "minOrder", width: 80, align: "right" },
        { title: "配送费", key: "fee", width: 80, align: "right" },
        { title: "时长", key: "time", width: 90, align: "right" },
        { title: "状态", key: "status", width: 90 },
        { title: "", key: "action", width: 80, align: "right" },
      ];
      const sortOptions = [
        { value: "default", label: "综合排序" },
        { value: "sales", label: "销量优先" },
        { value: "rating", label: "评分优先" },
        { value: "minOrder", label: "起送价最低" },
      ];
      const heroSearch = () => message.info(heroKeyword.value ? `搜索“${heroKeyword.value}”（演示）` : "请输入店铺或菜品");
      return {
        S, categories, category, sort, sortOptions, openOnly, freeDelivery, page, pageSize, scroller,
        filtered, paged, reset, open, columns, yuan, sales, coverStyle, heroKeyword, heroSearch,
        rowProps: (record) => ({ onClick: () => open(record), class: record.status === "营业中" ? "" : "row-closed" }),
      };
    },
    template: `
     <div class="view">
      <scroll-area ref="scroller" class="page-scroll" label="店铺列表">
      <section v-if="S.layout.hero" class="hero">
        <div class="wrap hero-inner">
          <h1 class="hero-title">附近好店，30 分钟送达</h1>
          <p class="hero-sub">按评分、销量和起送价挑选，菜品实时更新库存</p>
          <a-input-search v-model:value="heroKeyword" class="hero-search" size="large" placeholder="搜索店铺或菜品"
            enter-button="搜索" @search="heroSearch"/>
        </div>
      </section>

      <main class="wrap page">
        <div class="page-head">
          <h1 v-if="!S.layout.hero" class="page-title">附近商家</h1>
          <h2 v-else class="page-title">为你推荐</h2>
          <span class="muted">共 {{ filtered.length }} 家</span>
        </div>

        <div class="filters">
          <div class="cat-row">
            <template v-if="S.layout.category === 'tags'">
              <a-checkable-tag v-for="c in categories" :key="c" class="cat-tag" :checked="category === c" @change="category = c">{{ c }}</a-checkable-tag>
            </template>
            <a-segmented v-else-if="S.layout.category === 'segmented'" v-model:value="category" :options="categories"/>
            <a-radio-group v-else v-model:value="category" button-style="solid" size="small">
              <a-radio-button v-for="c in categories" :key="c" :value="c">{{ c }}</a-radio-button>
            </a-radio-group>
          </div>
          <div class="tool-row">
            <a-select v-model:value="sort" :options="sortOptions" style="width: 132px" aria-label="排序"/>
            <a-checkbox v-model:checked="openOnly">只看营业中</a-checkbox>
            <a-checkbox v-model:checked="freeDelivery">免配送费</a-checkbox>
          </div>
        </div>

        <a-empty v-if="!filtered.length" class="empty" description="暂无符合条件的店铺">
          <a-button :shape="S.buttonShape" @click="reset">清空筛选</a-button>
        </a-empty>

        <!-- A：三列网格卡片 -->
        <div v-else-if="S.layout.storeList === 'grid3'" class="store-grid3">
          <a-card v-for="s in paged" :key="s.id" class="store-card" :class="{ closed: s.status !== '营业中' }"
            :bordered="false" hoverable tabindex="0" @click="open(s)" @keydown.enter="open(s)">
            <template #cover>
              <div class="cover" :style="coverStyle(s.hue)">
                <span class="cover-initial">{{ s.name[0] }}</span>
                <a-tag v-if="s.promos[0]" class="cover-promo tag-promo">{{ s.promos[0] }}</a-tag>
                <a-tag v-if="s.status !== '营业中'" class="cover-status">休息中</a-tag>
              </div>
            </template>
            <div class="card-title-row"><h3 class="store-name">{{ s.name }}</h3><span class="rating num">{{ s.rating }}</span></div>
            <div class="meta"><a-rate :value="s.rating" disabled allow-half class="rate-sm"/><span>{{ sales(s.monthlySales) }}</span></div>
            <div class="meta"><span>起送 {{ yuan(s.minOrder) }}</span><span>{{ s.deliveryFee ? '配送 ' + yuan(s.deliveryFee) : '免配送费' }}</span><span><ico name="clock" :size="13"/> {{ s.deliveryTime }} 分钟</span></div>
          </a-card>
        </div>

        <!-- B：双列横向卡片 -->
        <div v-else-if="S.layout.storeList === 'grid2h'" class="store-grid2">
          <a-card v-for="s in paged" :key="s.id" class="store-card store-card-h" :class="{ closed: s.status !== '营业中' }"
            :bordered="false" hoverable tabindex="0" @click="open(s)" @keydown.enter="open(s)">
            <div class="h-inner">
              <div class="logo-block" :style="coverStyle(s.hue)">{{ s.name[0] }}</div>
              <div class="h-body">
                <div class="card-title-row">
                  <h3 class="store-name">{{ s.name }}</h3>
                  <a-tag :color="s.status === '营业中' ? 'success' : 'default'" class="tag-flat">{{ s.status }}</a-tag>
                </div>
                <div class="meta"><span class="rating num">{{ s.rating }} 分</span><span>{{ sales(s.monthlySales) }}</span><span>{{ s.deliveryTime }} 分钟</span></div>
                <div class="meta"><span>起送 {{ yuan(s.minOrder) }}</span><span>{{ s.deliveryFee ? '配送 ' + yuan(s.deliveryFee) : '免配送费' }}</span></div>
                <div class="promos"><a-tag v-for="p in s.promos" :key="p" class="tag-promo">{{ p }}</a-tag></div>
              </div>
              <a-button type="primary" :shape="S.buttonShape" class="enter-btn" :disabled="s.status !== '营业中'" @click.stop="open(s)">进店</a-button>
            </div>
          </a-card>
        </div>

        <!-- C：紧凑表格 -->
        <a-table v-else class="store-table" :columns="columns" :data-source="paged" row-key="id" :pagination="false"
          size="middle" :custom-row="rowProps">
          <template #bodyCell="{ column, record: s }">
            <div v-if="column.key === 'store'" class="t-store">
              <div class="logo-block sm" :style="coverStyle(s.hue)">{{ s.name[0] }}</div>
              <div>
                <div class="store-name">{{ s.name }}</div>
                <div class="promos"><span class="muted">{{ s.category }}</span><a-tag v-for="p in s.promos" :key="p" class="tag-promo">{{ p }}</a-tag></div>
              </div>
            </div>
            <span v-else-if="column.key === 'rating'" class="num strong">{{ s.rating }}</span>
            <span v-else-if="column.key === 'sales'" class="num">{{ sales(s.monthlySales).replace('月售 ', '') }}</span>
            <span v-else-if="column.key === 'minOrder'" class="num">{{ yuan(s.minOrder) }}</span>
            <span v-else-if="column.key === 'fee'" class="num">{{ s.deliveryFee ? yuan(s.deliveryFee) : '免' }}</span>
            <span v-else-if="column.key === 'time'" class="num">{{ s.deliveryTime }} 分钟</span>
            <a-tag v-else-if="column.key === 'status'" :color="s.status === '营业中' ? 'success' : 'default'" class="tag-flat">{{ s.status }}</a-tag>
            <a-button v-else-if="column.key === 'action'" type="link" size="small" @click.stop="open(s)">进店</a-button>
          </template>
        </a-table>

      </main>
      </scroll-area>
      <!-- 固定底栏：空页、单页也保留，与产品首页一致 -->
      <footer class="page-footer">
        <a-pagination v-model:current="page" :total="filtered.length" :page-size="pageSize" :show-size-changer="false"/>
      </footer>
     </div>`,
  };

  // ---------- 店铺页 ----------
  const StorePage = {
    props: { storeId: String },
    setup(props) {
      const store = computed(() => stores.find((s) => s.id === props.storeId));
      const groups = computed(() => menuOf(store.value));
      const active = ref("热销");
      const tableGroup = ref("热销");
      const sectionRefs = {};
      const setRef = (key) => (el) => {
        if (el) sectionRefs[key] = el;
      };
      // 与产品店铺页一致：页面不整体滚动，菜品列表是独立滚动容器，类目跳转与跟随都在容器内计算
      const dishScroll = ref(); // ScrollArea 组件，实际滚动的是它的 viewport
      const box = () => dishScroll.value?.viewport;
      const offsetIn = (el) => el.getBoundingClientRect().top - box().getBoundingClientRect().top;
      let lock = false;
      let unlockTimer = 0;
      const unlockSoon = () => {
        clearTimeout(unlockTimer);
        unlockTimer = setTimeout(() => (lock = false), 150);
      };
      const scrollTo = (key) => {
        active.value = key;
        const el = sectionRefs[key];
        const v = box();
        if (!el || !v) return;
        lock = true;
        v.scrollTo({ top: v.scrollTop + offsetIn(el), behavior: "smooth" });
        unlockSoon(); // 已到底无法滚动时也能解锁
      };
      const onScroll = () => {
        if (lock) return unlockSoon(); // 平滑滚动结束后再恢复跟随
        const v = box();
        if (!v) return;
        const picked = sectionRefs[active.value];
        // 到底时最后几组无法滚到顶部，保留用户点选的分组
        const atBottom = v.scrollTop + v.clientHeight >= v.scrollHeight - 2;
        if (atBottom && picked && offsetIn(picked) < v.clientHeight) return;
        let current = groups.value[0].key;
        for (const g of groups.value) {
          const el = sectionRefs[g.key];
          if (el && offsetIn(el) - 8 <= 0) current = g.key;
        }
        active.value = current;
      };
      watch(tableGroup, () => dishScroll.value?.scrollTo({ top: 0 }));

      // 购物车
      const allDishes = computed(() => {
        const map = new Map();
        groups.value.forEach((g) => g.dishes.forEach((d) => map.set(d.id, d)));
        return map;
      });
      const items = computed(() =>
        Object.entries(state.cart[props.storeId] || {}).map(([id, qty]) => ({ dish: allDishes.value.get(id), qty })),
      );
      const count = computed(() => items.value.reduce((a, i) => a + i.qty, 0));
      const subtotal = computed(() => items.value.reduce((a, i) => a + i.qty * i.dish.price, 0));
      const gap = computed(() => Math.max(0, store.value.minOrder - subtotal.value));
      const total = computed(() => subtotal.value + (count.value ? store.value.deliveryFee : 0));
      const clear = () => {
        state.cart = { ...state.cart, [props.storeId]: {} };
      };
      const checkout = () => message.success("已进入结算（演示页面，不会提交订单）");
      const open = computed(() => store.value.status === "营业中");

      const tableColumns = [
        { title: "菜品", key: "dish" },
        { title: "月售", key: "sales", width: 100, align: "right" },
        { title: "价格", key: "price", width: 110, align: "right" },
        { title: "数量", key: "qty", width: 130, align: "right" },
      ];
      const tableRows = computed(() => groups.value.find((g) => g.key === tableGroup.value)?.dishes || []);

      return {
        S, state, store, groups, active, tableGroup, setRef, scrollTo, dishScroll, onScroll, items, count, subtotal, gap, total,
        clear, checkout, open, yuan, sales, coverStyle, tableColumns, tableRows, simpleImage: antd.Empty.PRESENTED_IMAGE_SIMPLE,
        menuItems: computed(() => groups.value.map((g) => ({ key: g.key, label: `${g.name}  ${g.dishes.length}` }))),
        setQty,
      };
    },
    template: `
     <div class="view">
      <main class="wrap store-page">
        <a-breadcrumb class="crumb">
          <a-breadcrumb-item><a href="#/">首页</a></a-breadcrumb-item>
          <a-breadcrumb-item>{{ store.name }}</a-breadcrumb-item>
        </a-breadcrumb>

        <section class="store-head" :class="'head-' + S.layout.storeHead">
          <div class="logo-block lg" :style="coverStyle(store.hue)">{{ store.name[0] }}</div>
          <div class="store-head-body">
            <div class="card-title-row">
              <h1 class="store-title">{{ store.name }}</h1>
              <a-tag :color="open ? 'success' : 'default'" class="tag-flat">{{ store.status }}</a-tag>
            </div>
            <div class="meta">
              <span class="rating num">{{ store.rating }} 分</span><span>{{ sales(store.monthlySales) }}</span>
              <span>起送 {{ yuan(store.minOrder) }}</span>
              <span>{{ store.deliveryFee ? '配送 ' + yuan(store.deliveryFee) : '免配送费' }}</span>
              <span>约 {{ store.deliveryTime }} 分钟</span>
            </div>
            <div class="promos"><a-tag v-for="p in store.promos" :key="p" class="tag-promo">{{ p }}</a-tag></div>
            <p class="notice"><ico name="bell" :size="14"/> {{ store.notice }}</p>
          </div>
        </section>

        <a-alert v-if="!open" type="warning" show-icon class="closed-alert" message="店铺休息中，可以先浏览菜单，营业后再下单"/>

        <div class="store-body" :class="'nav-' + S.layout.menuNav">
          <!-- A：左侧类目菜单 -->
          <scroll-area v-if="S.layout.menuNav === 'side'" class="side-nav" label="菜品分类">
            <a-menu mode="inline" :selected-keys="[active]" :items="menuItems" @click="({ key }) => scrollTo(key)"/>
          </scroll-area>

          <div class="menu-main">
            <!-- B：类目 Tabs 固定在菜品滚动区上方 -->
            <div v-if="S.layout.menuNav === 'tabs'" class="menu-tabs">
              <a-tabs :active-key="active" @change="scrollTo">
                <a-tab-pane v-for="g in groups" :key="g.key" :tab="g.name"/>
              </a-tabs>
            </div>

            <!-- C：菜品表格 -->
            <template v-if="S.layout.menuNav === 'table'">
              <div class="table-tools">
                <a-segmented v-model:value="tableGroup" :options="groups.map(g => ({ label: g.name + ' ' + g.dishes.length, value: g.key }))"/>
              </div>
              <scroll-area ref="dishScroll" class="dish-scroll" label="菜品列表">
              <a-table class="dish-table" :columns="tableColumns" :data-source="tableRows" row-key="id" :pagination="false" size="middle">
                <template #bodyCell="{ column, record: d }">
                  <div v-if="column.key === 'dish'" class="t-store" :class="{ 'is-soldout': d.soldOut }">
                    <div class="logo-block sm" :style="coverStyle(d.hue)">{{ d.name[0] }}</div>
                    <div>
                      <div class="dish-name">{{ d.name }} <a-tag v-if="d.signature" class="tag-promo">招牌</a-tag></div>
                      <div class="muted small">{{ d.desc }}</div>
                    </div>
                  </div>
                  <span v-else-if="column.key === 'sales'" class="num muted">{{ sales(d.monthlySales).replace('月售 ', '') }}</span>
                  <span v-else-if="column.key === 'price'" class="price-cell">
                    <s v-if="d.originalPrice" class="price-old num">{{ yuan(d.originalPrice) }}</s>
                    <span class="price num">{{ yuan(d.price) }}</span>
                  </span>
                  <qty-stepper v-else-if="column.key === 'qty'" :store-id="store.id" :dish="d"/>
                </template>
              </a-table>
              </scroll-area>
            </template>

            <!-- A / B：分组菜品列表 -->
            <!-- project：同产品 Store.vue，双列 DishCard、灰色小分组标题、滚动条在列外 -->
            <scroll-area v-else ref="dishScroll" class="dish-scroll" label="菜品列表"
              :placement="S.layout.dishLayout === 'project' ? 'outside' : 'inside'" @scroll="onScroll">
              <section v-for="g in groups" :key="g.key" :ref="setRef(g.key)" class="dish-group"
                :class="{ 'dish-group--project': S.layout.dishLayout === 'project' }">
                <h2 class="group-title">{{ g.name }} <span v-if="S.layout.dishLayout !== 'project'" class="muted small">{{ g.dishes.length }} 个</span></h2>
                <div :class="{ list: 'dish-list', grid2: 'dish-grid2', project: 'dish-grid2 dish-grid2--project' }[S.layout.dishLayout]">
                  <article v-for="d in g.dishes" :key="g.key + d.id" class="dish" :class="{ 'is-soldout': d.soldOut }">
                    <div class="thumb" :style="coverStyle(d.hue)">{{ d.name[0] }}</div>
                    <div class="dish-body">
                      <h3 class="dish-name">{{ d.name }} <a-tag v-if="d.signature" class="tag-promo">招牌</a-tag></h3>
                      <p class="muted small ellipsis">{{ d.desc }}</p>
                      <p class="muted small">{{ sales(d.monthlySales) }}</p>
                      <div class="dish-foot">
                        <span><span class="price num">{{ yuan(d.price) }}</span>
                          <s v-if="d.originalPrice" class="price-old num">{{ yuan(d.originalPrice) }}</s></span>
                        <qty-stepper :store-id="store.id" :dish="d"/>
                      </div>
                    </div>
                  </article>
                </div>
              </section>
            </scroll-area>
          </div>

          <!--
            购物车面板，结构同 frontend/src/components/CartPanel.vue：
            面板按内容高度（align-self: start），清单行高固定，最多显示 5.5 行后在覆盖式滚动区内滚动；
            头部、费用、底部固定；各段左右内边距一致，滚动条不占宽度，溢出前后布局不变。
          -->
          <div class="cart-col">
            <aside class="cart-panel" :class="{ bordered: S.cartBordered }" aria-label="购物车">
              <div class="cart-head">
                <span class="cart-title"><ico name="bag" :size="16"/> 购物车 <a-badge :count="count" :number-style="{ boxShadow: 'none' }"/></span>
                <a-button v-if="count" type="link" size="small" danger @click="clear">清空</a-button>
              </div>
              <scroll-area v-if="count" class="cart-list" content-class="cart-items" label="购物车商品列表">
                <div v-for="item in items" :key="item.dish.id" class="cart-item">
                  <span class="cart-item-name ellipsis" :title="item.dish.name">{{ item.dish.name }}</span>
                  <qty-stepper :store-id="store.id" :dish="item.dish"/>
                  <span class="num cart-line">{{ yuan(item.dish.price * item.qty) }}</span>
                </div>
              </scroll-area>
              <a-empty v-else :image="simpleImage" class="cart-empty" description="还没有选购商品"/>
              <div class="cart-sum">
                <div class="sum-row"><span>商品小计</span><span class="num">{{ yuan(subtotal) }}</span></div>
                <div class="sum-row"><span>配送费</span><span class="num">{{ count && store.deliveryFee ? yuan(store.deliveryFee) : '免配送费' }}</span></div>
              </div>
              <div v-if="count && gap" class="cart-hint">
                <span class="muted small">差 {{ yuan(gap) }} 起送</span>
                <a-progress :percent="Math.round((subtotal / store.minOrder) * 100)" :show-info="false" size="small" class="gap-progress"/>
              </div>
              <div class="cart-foot">
                <div class="sum-row total"><span>合计</span><span class="price price-lg num">{{ yuan(total) }}</span></div>
                <a-button type="primary" block size="large" :shape="S.buttonShape" class="checkout-btn"
                  :disabled="!open || !count || gap > 0" @click="checkout">
                  {{ !open ? '休息中' : !count ? yuan(store.minOrder) + ' 起送' : gap ? '差 ' + yuan(gap) + ' 起送' : '去结算' }}
                </a-button>
              </div>
            </aside>
          </div>
        </div>
      </main>
     </div>`,
  };

  // ---------- 方案切换条（demo 外壳，不属于设计本身） ----------
  const DemoBar = {
    setup() {
      const schemes = [
        { key: "fresh", label: "A 清爽橙" },
        { key: "vibrant", label: "B 活力橙" },
        { key: "minimal", label: "C 黑黄极简" },
      ];
      return { S, schemes, hash: computed(() => (state.route.name === "store" ? `#/store/${state.route.id}` : "")) };
    },
    template: `
      <div class="demo-bar" role="navigation" aria-label="设计方案">
        <span>设计 demo</span>
        <a v-for="s in schemes" :key="s.key" :href="s.key + '.html' + hash" :class="{ on: s.key === S.key }">{{ s.label }}</a>
        <a href="index.html" class="demo-back">方案对比</a>
      </div>`,
  };

  // ---------- 外壳：把 antd token 转成 CSS 变量 ----------
  const Shell = {
    setup() {
      const { token } = theme.useToken();
      const vars = computed(() => {
        const t = token.value;
        return {
          "--c-primary": t.colorPrimary,
          "--c-primary-bg": t.colorPrimaryBg,
          "--c-primary-text": t.colorPrimaryText,
          "--c-on-primary": t.colorTextLightSolid,
          "--c-bg": t.colorBgLayout,
          "--c-card": t.colorBgContainer,
          "--c-elevated": t.colorBgElevated,
          "--c-fill": t.colorFillTertiary,
          "--c-fill-2": t.colorFillSecondary,
          "--c-text": t.colorText,
          "--c-text-2": t.colorTextSecondary,
          "--c-text-3": t.colorTextTertiary,
          "--c-border": t.colorBorderSecondary,
          "--c-border-strong": t.colorBorder,
          "--c-success": t.colorSuccess,
          "--radius": t.borderRadius + "px",
          "--radius-lg": t.borderRadiusLG + "px",
          "--radius-sm": t.borderRadiusSM + "px",
          ...S.vars[state.dark ? "dark" : "light"],
        };
      });
      watch(
        vars,
        (v) => {
          document.body.style.background = v["--c-bg"];
          document.documentElement.style.colorScheme = state.dark ? "dark" : "light";
        },
        { immediate: true },
      );
      return { vars, state, S };
    },
    template: `
      <div class="demo-root" :class="['style-' + S.key, state.dark ? 'is-dark' : 'is-light']" :style="vars">
        <demo-bar/>
        <site-header/>
        <home-page v-if="state.route.name === 'home'"/>
        <store-page v-else :key="state.route.id" :store-id="state.route.id"/>
      </div>`,
  };

  const App = {
    setup() {
      const themeConfig = computed(() => {
        const algorithm = [state.dark ? theme.darkAlgorithm : theme.defaultAlgorithm];
        if (S.compact) algorithm.push(theme.compactAlgorithm);
        return {
          algorithm,
          token: { ...S.token, ...(state.dark ? S.darkToken : {}) },
          components: S.components ? S.components(state.dark) : undefined,
        };
      });
      return { themeConfig, locale: antd.locales?.zh_CN };
    },
    template: `<a-config-provider :theme="themeConfig" :locale="locale" :auto-insert-space-in-button="false"><shell/></a-config-provider>`,
  };

  document.title = `盟信外卖 · 方案 ${S.letter} ${S.name}`;
  const app = createApp(App);
  app.use(antd);
  Object.entries({ Ico, ScrollArea, QtyStepper, SiteHeader, HomePage, StorePage, DemoBar, Shell }).forEach(([n, c]) => app.component(n, c));
  app.mount("#app");
})();
