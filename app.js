(function () {
  "use strict";

  const STORAGE_KEY = "freight-agent-v1";
  const COLORS = ["#0c7658", "#ef7f45", "#77a8c9", "#a886c8", "#d2ad43", "#677a72"];
  const BASIS_LABELS = {
    per_cbm: "按方 / CBM",
    per_kg: "按计费重 / kg",
    wm: "W/M 收费吨",
    per_container: "按整柜",
    per_carton: "按箱",
    per_shipment: "按票"
  };
  const MARKET = {
    US: { label: "美国站", flag: "🇺🇸", currency: "USD", duty: 5, vat: 0 },
    UK: { label: "英国站", flag: "🇬🇧", currency: "GBP", duty: 4, vat: 20 }
  };

  const METHOD_CATALOG = [
    { id: "send_air", icon: "✈", name: "Amazon SEND · 空运", owner: "Amazon", markets: "美国 / 英国", basis: "kg / 票", desc: "Seller Export & Delivery，承运商上门或送仓，含出口与目的国清关流程衔接。" },
    { id: "send_ocean", icon: "◈", name: "Amazon SEND · 海运", owner: "Amazon", markets: "美国 / 英国", basis: "CBM / 柜", desc: "Seller Central 内订舱、付款与追踪，可直送 FBA 或 AWD。" },
    { id: "agl_lcl", icon: "▦", name: "AGL · 海运散货", owner: "Amazon", markets: "美国 / 英国", basis: "W/M / CBM", desc: "Amazon Global Logistics 中国起运的拼箱海运，适合中等批量。" },
    { id: "agl_fcl", icon: "▣", name: "AGL · 海运整柜", owner: "Amazon", markets: "美国 / 英国", basis: "20GP / 40GP / 40HQ", desc: "中国至 Amazon 网络的整柜运输，可按柜型、柜数计费。" },
    { id: "awd", icon: "⌂", name: "AWD 入仓与转运", owner: "Amazon", markets: "美国", basis: "箱 / 立方英尺", desc: "大宗库存进入 AWD，再按需补货 FBA；可叠加仓储、处理及 AWD→FBA 运输。" },
    { id: "gwd", icon: "◎", name: "GWD 深圳仓", owner: "Amazon", markets: "美国", basis: "实时账单", desc: "Global Warehousing and Distribution：深圳存储并补货至美国 FBA。" },
    { id: "pc_spd", icon: "▤", name: "Partnered Carrier · SPD", owner: "Amazon", markets: "美国境内", basis: "箱 / 重量", desc: "Amazon 合作承运商小包裹入仓，适合海外仓至 FBA。" },
    { id: "pc_ltl", icon: "▥", name: "Partnered Carrier · LTL", owner: "Amazon", markets: "美国境内", basis: "托盘 / 重量", desc: "合作承运商零担、联运方案，通常要求托盘化。" },
    { id: "pc_ftl", icon: "▰", name: "Partnered Carrier · FTL", owner: "Amazon", markets: "美国境内", basis: "整车", desc: "合作承运商整车入仓，适合大批量海外仓补货。" },
    { id: "seller_managed", icon: "↗", name: "卖家自选承运商", owner: "Amazon", markets: "美国 / 英国", basis: "承运商报价", desc: "卖家管理的 SPD、LTL、FTL 或预约入仓方案。" },
    { id: "ffo", icon: "◇", name: "FBA from Origin (FFO)", owner: "Amazon", markets: "美国", basis: "SPD / LTL / FTL", desc: "符合资格的商品先入 Amazon 中国起运仓，再由 Amazon 网络衔接目的国履约。" },
    { id: "express", icon: "⚡", name: "国际快递", owner: "第三方", markets: "美国 / 英国", basis: "计费重 kg", desc: "DHL、UPS、FedEx 等商业快递，按实重与体积重取大。" },
    { id: "air", icon: "△", name: "空运专线", owner: "第三方", markets: "美国 / 英国", basis: "计费重 kg", desc: "空运干线加清关派送，可配置体积系数、最低消费和附加费。" },
    { id: "sea_fast", icon: "≈", name: "海运快船 / 海卡", owner: "第三方", markets: "美国 / 英国", basis: "CBM / W/M", desc: "优先船期加卡车派送，适合对时效较敏感的补货。" },
    { id: "sea_slow", icon: "∿", name: "海运普船 / 海派", owner: "第三方", markets: "美国 / 英国", basis: "CBM / W/M", desc: "普通船期加快递或卡车派送，适合成本优先的大货。" },
    { id: "sea_lcl", icon: "≋", name: "海运 LCL", owner: "第三方", markets: "美国 / 英国", basis: "CBM / W/M", desc: "拼箱海运，支持按方、收费吨、最低方数及目的港杂费。" },
    { id: "sea_fcl", icon: "□", name: "海运 FCL", owner: "第三方", markets: "美国 / 英国", basis: "整柜", desc: "20GP、40GP、40HQ 整柜，按柜数及利用率自动估算。" },
    { id: "rail", icon: "═", name: "中欧班列 + 英国派送", owner: "第三方", markets: "英国", basis: "CBM / kg", desc: "铁路至欧洲枢纽后转英国，适合时效与成本折中方案。" },
    { id: "truck", icon: "▱", name: "卡航 / 跨境陆运", owner: "第三方", markets: "英国", basis: "CBM / kg", desc: "陆路干线与末端派送组合，可作为旺季替代路线。" }
  ];

  function todayPlus(days) {
    const d = new Date(); d.setDate(d.getDate() + days); return d.toISOString().slice(0, 10);
  }

  function defaultState() {
    return {
      page: "agent",
      settings: {
        usdCny: 7.20, gbpCny: 9.30, airDivisor: 6000, expressDivisor: 5000, fclUtilization: 90,
        awdInboundPerBox: 1.40, awdTransportBase: 1.40, awdTransportManaged: 1.26,
        awdStorageWestBase: 0.57, awdStorageWestSmart: 0.51, awdStorageWestManaged: 0.46,
        awdStorageOtherBase: 0.48, awdStorageOtherSmart: 0.43, awdStorageOtherManaged: 0.38
      },
      shipment: {
        origin: "深圳", market: "US", fulfillment: "FBA", warehouse: "ONT8", quantity: 480,
        splitEnabled: false, splits: [{ warehouse: "ONT8", cartonCount: 20, quantity: 480 }],
        unitsPerCarton: 24, cartonCount: 20, length: 54, width: 40, height: 35, cartonWeight: 15.5,
        declaredUnitValue: 7.5, dutyRate: 5, vatRate: 0, insurancePct: 0.3,
        inboundPlacementFee: 0, includeTaxes: true, useAwd: false, awdRegion: "west",
        awdTier: "base", awdMonths: 0.5, containerType: "40HQ"
      },
      quotes: [
        { id: "demo-us-lcl-ont8", carrier: "瀚海物流（演示）", warehouse: "ONT8", market: "US", fulfillment: "FBA", modeId: "sea_lcl", basis: "per_cbm", rate: 860, currency: "CNY", minCharge: 1800, originFee: 380, exportFee: 300, docFee: 180, destFee: 680, deliveryFee: 420, surchargePct: 3, transitMin: 24, transitMax: 31, validUntil: todayPlus(30), note: "演示价，含海运干线；不代表实时市场报价", demo: true, enabled: true },
        { id: "demo-us-air-ont8", carrier: "云翼国际（演示）", warehouse: "ONT8", market: "US", fulfillment: "FBA", modeId: "air", basis: "per_kg", rate: 38, currency: "CNY", minCharge: 1200, originFee: 260, exportFee: 220, docFee: 100, destFee: 480, deliveryFee: 320, surchargePct: 2, transitMin: 8, transitMax: 12, validUntil: todayPlus(14), note: "演示价，体积重按 6000", demo: true, enabled: true },
        { id: "demo-us-send", carrier: "Amazon SEND（待更新）", warehouse: "*", market: "US", fulfillment: "FBA", modeId: "send_ocean", basis: "per_cbm", rate: 0, currency: "USD", minCharge: 0, originFee: 0, exportFee: 0, docFee: 0, destFee: 0, deliveryFee: 0, surchargePct: 0, transitMin: 25, transitMax: 40, validUntil: todayPlus(7), note: "请从 Seller Central 粘贴本票实时价", demo: false, enabled: true },
        { id: "demo-uk-lcl-bhx4", carrier: "英桥供应链（演示）", warehouse: "BHX4", market: "UK", fulfillment: "FBA", modeId: "sea_lcl", basis: "wm", rate: 980, currency: "CNY", minCharge: 2100, originFee: 420, exportFee: 320, docFee: 180, destFee: 760, deliveryFee: 520, surchargePct: 3, transitMin: 30, transitMax: 38, validUntil: todayPlus(21), note: "演示价，W/M 计费；税费另计", demo: true, enabled: true },
        { id: "demo-uk-rail", carrier: "欧陆班列（演示）", warehouse: "BHX4", market: "UK", fulfillment: "FBA", modeId: "rail", basis: "per_cbm", rate: 1450, currency: "CNY", minCharge: 2600, originFee: 450, exportFee: 320, docFee: 160, destFee: 650, deliveryFee: 480, surchargePct: 2, transitMin: 20, transitMax: 27, validUntil: todayPlus(21), note: "演示价，不代表实时市场报价", demo: true, enabled: true }
      ],
      messages: [
        { role: "agent", text: "你好，我是头程智算 Agent。\n\n你可以直接告诉我产品外箱尺寸、箱重、箱数、目的站点和报价，我会自动换算 CBM、体积重、收费吨，并比较 FBA / FBM 方案。", time: "现在" }
      ]
    };
  }

  function loadState() {
    try {
      const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
      if (saved && saved.shipment && Array.isArray(saved.quotes)) {
        const base = defaultState();
        return { ...base, ...saved, settings: { ...base.settings, ...saved.settings }, shipment: { ...base.shipment, ...saved.shipment } };
      }
    } catch (_) {}
    return defaultState();
  }
  let state = loadState();
  let quoteFilter = { q: "", market: "ALL" };

  function save() { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); }
  function esc(v) { return String(v == null ? "" : v).replace(/[&<>'"]/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;","'":"&#39;",'"':"&quot;"}[c])); }
  function num(v, fallback = 0) { const n = Number(v); return Number.isFinite(n) ? n : fallback; }
  function money(v, currency = "CNY", digits = 0) {
    const symbol = currency === "USD" ? "$" : currency === "GBP" ? "£" : "¥";
    return symbol + num(v).toLocaleString("zh-CN", { minimumFractionDigits: digits, maximumFractionDigits: digits });
  }
  function fmt(v, digits = 2) { return num(v).toLocaleString("zh-CN", { maximumFractionDigits: digits }); }
  function uid() { return "q-" + Date.now().toString(36) + Math.random().toString(36).slice(2, 6); }
  function mode(id) { return METHOD_CATALOG.find(m => m.id === id) || { name: id, owner: "第三方" }; }
  function fx(currency) { return currency === "USD" ? state.settings.usdCny : currency === "GBP" ? state.settings.gbpCny : 1; }
  function localCurrency() { return MARKET[state.shipment.market].currency; }
  function toLocal(cny) { return cny / fx(localCurrency()); }
  function warehouseMatch(q, warehouse) { return q.warehouse === "*" || q.warehouse.toUpperCase() === String(warehouse || state.shipment.warehouse).toUpperCase(); }
  function activeSplits() {
    const s = state.shipment;
    if (!s.splitEnabled || !Array.isArray(s.splits) || s.splits.length < 2) return [{ warehouse: s.warehouse, cartonCount: s.cartonCount, quantity: s.quantity }];
    return s.splits.filter(x => x.warehouse && num(x.cartonCount) > 0).map(x => ({ warehouse: String(x.warehouse).toUpperCase(), cartonCount: num(x.cartonCount), quantity: num(x.quantity) }));
  }
  function warehouseLabel() { return activeSplits().map(x => x.warehouse).join(" + "); }

  function shipmentMetrics(q, allocation) {
    const s = state.shipment;
    const cartonCount = allocation ? num(allocation.cartonCount) : s.cartonCount;
    const quantity = allocation ? num(allocation.quantity) : s.quantity;
    const cbm = s.length * s.width * s.height / 1000000 * cartonCount;
    const actualKg = s.cartonWeight * cartonCount;
    const divisor = q && q.modeId === "express" ? state.settings.expressDivisor : state.settings.airDivisor;
    const volumeKg = s.length * s.width * s.height / divisor * cartonCount;
    return { cbm, cuft: cbm * 35.3147, actualKg, volumeKg, chargeKg: Math.max(actualKg, volumeKg), wm: Math.max(cbm, actualKg / 1000), cartonCount, quantity };
  }

  function computeQuote(q, allocation) {
    const targetWarehouse = allocation ? allocation.warehouse : state.shipment.warehouse;
    if (!q.enabled || num(q.rate) <= 0 || q.market !== state.shipment.market || q.fulfillment !== state.shipment.fulfillment || !warehouseMatch(q, targetWarehouse)) return null;
    const s = state.shipment, m = shipmentMetrics(q, allocation), rate = num(q.rate), factor = fx(q.currency);
    let basisQty = 1, containerCount = 0;
    if (q.basis === "per_cbm") basisQty = m.cbm;
    if (q.basis === "per_kg") basisQty = m.chargeKg;
    if (q.basis === "wm") basisQty = m.wm;
    if (q.basis === "per_carton") basisQty = m.cartonCount;
    if (q.basis === "per_container") {
      const caps = { "20GP": 28, "40GP": 58, "40HQ": 68 };
      containerCount = Math.max(1, Math.ceil(m.cbm / (caps[s.containerType] * state.settings.fclUtilization / 100)));
      basisQty = containerCount;
    }
    const freightForeign = Math.max(rate * basisQty, num(q.minCharge));
    const freight = freightForeign * factor;
    const origin = (num(q.originFee) + num(q.exportFee) + num(q.docFee)) * factor;
    const destination = (num(q.destFee) + num(q.deliveryFee)) * factor;
    const surcharge = freight * num(q.surchargePct) / 100;
    const cargoValueCny = s.declaredUnitValue * m.quantity * fx(localCurrency());
    const insurance = cargoValueCny * num(s.insurancePct) / 100;
    const customsBase = cargoValueCny + freight + insurance;
    const duty = s.includeTaxes ? customsBase * num(s.dutyRate) / 100 : 0;
    const vat = s.includeTaxes ? (customsBase + duty) * num(s.vatRate) / 100 : 0;
    const placement = num(s.inboundPlacementFee) * fx(localCurrency()) * (m.quantity / Math.max(1, s.quantity));
    let amazon = placement;
    if (s.useAwd && s.market === "US") {
      const transportRate = s.awdTier === "managed" ? state.settings.awdTransportManaged : state.settings.awdTransportBase;
      const storageRate = s.awdRegion === "west"
        ? (s.awdTier === "managed" ? state.settings.awdStorageWestManaged : s.awdTier === "smart" ? state.settings.awdStorageWestSmart : state.settings.awdStorageWestBase)
        : (s.awdTier === "managed" ? state.settings.awdStorageOtherManaged : s.awdTier === "smart" ? state.settings.awdStorageOtherSmart : state.settings.awdStorageOtherBase);
      amazon += (m.cartonCount * state.settings.awdInboundPerBox + m.cuft * transportRate + m.cuft * storageRate * num(s.awdMonths)) * state.settings.usdCny;
    }
    const total = freight + origin + destination + surcharge + insurance + duty + vat + amazon;
    const days = (num(q.transitMin) + num(q.transitMax)) / 2 || 99;
    return {
      q, m, basisQty, containerCount, freight, origin, destination, surcharge, insurance, duty, vat, amazon, total,
      perUnit: total / Math.max(1, m.quantity), days, warehouse: targetWarehouse, expired: q.validUntil && q.validUntil < new Date().toISOString().slice(0, 10)
    };
  }

  function results() {
    const splits = activeSplits();
    let list;
    if (state.shipment.splitEnabled && splits.length > 1) {
      const groups = new Map();
      state.quotes.filter(q => q.enabled && num(q.rate) > 0 && q.market === state.shipment.market && q.fulfillment === state.shipment.fulfillment).forEach(q => {
        const key = q.quoteGroup ? `batch:${q.quoteGroup}` : `route:${q.carrier}::${q.modeId}`;
        if (!groups.has(key)) groups.set(key, []);
        groups.get(key).push(q);
      });
      list = [...groups.values()].map(quotes => {
        const legs = splits.map(allocation => {
          const candidates = quotes.filter(q => warehouseMatch(q, allocation.warehouse)).map(q => computeQuote(q, allocation)).filter(Boolean).sort((a,b) => a.total-b.total);
          return candidates[0] || null;
        });
        if (legs.some(x => !x)) return null;
        const sum = key => legs.reduce((t, x) => t + num(x[key]), 0);
        const first = legs[0].q;
        const carrier = first.carrier;
        const sameMode = legs.every(x => x.q.modeId === first.modeId);
        const total = sum("total");
        const quantity = splits.reduce((t,x)=>t+num(x.quantity),0);
        return {
          q: { ...first, carrier, warehouse: splits.map(x=>x.warehouse).join(" + "), basis: "per_shipment", modeId: sameMode ? first.modeId : "seller_managed", validUntil: legs.map(x=>x.q.validUntil).filter(Boolean).sort()[0] || "" },
          legs, split: true, m: { cbm: sumMetric(legs,"cbm"), actualKg: sumMetric(legs,"actualKg"), chargeKg: sumMetric(legs,"chargeKg"), wm: sumMetric(legs,"wm") },
          freight: sum("freight"), origin: sum("origin"), destination: sum("destination"), surcharge: sum("surcharge"), insurance: sum("insurance"), duty: sum("duty"), vat: sum("vat"), amazon: sum("amazon"), total,
          perUnit: total / Math.max(1, quantity), days: Math.max(...legs.map(x=>x.days)), expired: legs.some(x=>x.expired)
        };
      }).filter(Boolean).sort((a,b)=>a.total-b.total);
    } else {
      list = state.quotes.map(q => computeQuote(q, splits[0])).filter(Boolean).sort((a, b) => a.total - b.total);
    }
    const maxCost = Math.max(...list.map(x => x.total), 1), maxDays = Math.max(...list.map(x => x.days), 1);
    list.forEach(r => {
      const completeness = [r.q.rate, r.q.transitMin, r.q.validUntil, r.q.warehouse].filter(Boolean).length / 4;
      r.score = Math.round((1 - r.total / maxCost) * 45 + (1 - r.days / maxDays) * 35 + completeness * 20);
    });
    return list;
  }
  function sumMetric(legs, key) { return legs.reduce((t,x)=>t+num(x.m && x.m[key]),0); }

  const NAV = [
    ["agent", "✦", "智能测算"], ["quotes", "▥", "动态报价库"], ["compare", "⇄", "方案对比"],
    ["catalog", "▦", "运输方式"], ["settings", "⚙", "参数设置"], ["about", "◌", "口径与来源"]
  ];

  function renderNav() {
    document.getElementById("nav").innerHTML = NAV.map(([id, icon, label]) => `<button class="nav-item ${state.page === id ? "active" : ""}" data-page="${id}"><span class="nav-icon">${icon}</span>${label}</button>`).join("");
    const current = NAV.find(x => x[0] === state.page);
    document.getElementById("pageTitle").textContent = current ? current[2] : "头程智算";
    document.getElementById("marketPill").textContent = `${MARKET[state.shipment.market].flag} ${MARKET[state.shipment.market].label} · ${state.shipment.fulfillment}`;
  }

  function render() {
    renderNav();
    const view = document.getElementById("view");
    const renderers = { agent: renderAgent, quotes: renderQuotes, compare: renderCompare, catalog: renderCatalog, settings: renderSettings, about: renderAbout };
    view.innerHTML = (renderers[state.page] || renderAgent)();
    if (state.page === "agent") setTimeout(() => { const t = document.querySelector(".chat-thread"); if (t) t.scrollTop = t.scrollHeight; }, 0);
  }

  function renderAgent() {
    const s = state.shipment, m = shipmentMetrics(), splits = activeSplits(), routeLabel = warehouseLabel(), list = results(), best = list[0];
    return `<div class="agent-grid">
      <section class="panel chat-panel">
        <div class="panel-head"><div><h2>对话式费用 Agent</h2><p>自然语言录入货件、仓点与承运商报价</p></div><button class="ghost mini" data-action="clear-chat">清空</button></div>
        <div class="chat-thread">${state.messages.map(msg => `<div class="message ${msg.role}">${esc(msg.text)}<small>${esc(msg.time || "")}</small></div>`).join("")}</div>
        <div class="prompt-chips">
          <button class="chip" data-prompt="产品外箱 54×40×35cm，每箱15.5kg，共20箱480件，发美国ONT8 FBA">录入货件</button>
          <button class="chip" data-prompt="添加报价：捷航物流 ONT8 海运 880元/方，时效25-32天">添加单仓报价</button>
          <button class="chip" data-prompt="分仓发货：ONT8 10箱240件，ABE8 6箱144件，FTW1 4箱96件">设置分仓货件</button>
          <button class="chip" data-action="open-split-quote">批量录入分仓报价</button>
          <button class="chip" data-prompt="比较当前所有可用方案">比较方案</button>
        </div>
        <form class="chat-compose" id="chatForm"><textarea id="chatInput" rows="1" placeholder="例如：40×30×25cm，12kg/箱，30箱，发英国BHX4…"></textarea><button class="send-btn" title="发送">↑</button></form>
      </section>

      <div>
        <div class="shipment-strip">
          <div class="route"><div><small>起运地</small><br><b>${esc(s.origin)}</b></div><span class="route-line"></span><div><small>${splits.length>1?"分仓目的地":"目的仓"}</small><br><b>${esc(routeLabel)}</b></div></div>
          <div><small>${MARKET[s.market].label} · ${s.fulfillment}${splits.length>1?` · ${splits.length}仓合并计费`:""}${s.useAwd ? " · 经 AWD" : ""}</small><br><button class="link-btn" data-action="open-shipment">编辑货件 →</button></div>
        </div>
        <div class="summary-grid">
          <div class="metric"><span>总体积</span><strong>${fmt(m.cbm, 3)}<em>CBM</em></strong></div>
          <div class="metric"><span>实重</span><strong>${fmt(m.actualKg, 1)}<em>kg</em></strong></div>
          <div class="metric"><span>空运计费重</span><strong>${fmt(m.chargeKg, 1)}<em>kg</em></strong></div>
          <div class="metric"><span>收费吨 W/M</span><strong>${fmt(m.wm, 3)}<em>RT</em></strong></div>
        </div>
        <section class="panel">
          <div class="panel-head"><div><h2>实时测算结果</h2><p>${list.length} 个承运商方案${splits.length>1?`完整覆盖 ${splits.length} 个仓点`:`匹配 ${esc(routeLabel)}`}，税费${s.includeTaxes ? "已计入" : "未计入"}</p></div><button class="ghost mini" data-page="compare">完整对比</button></div>
          <div class="panel-body">
             ${best ? renderBest(best) : `<div class="empty-state"><div class="empty-icon">⌁</div><h3>还没有可计算的完整报价</h3><p>${splits.length>1?"同一承运商需要为每个分仓仓点都提供有效报价，系统会逐仓计算并把费用相加。":"当前仓点没有单价大于 0 的有效报价。"}</p><button class="primary" data-action="${splits.length>1?"open-split-quote":"open-quote"}">${splits.length>1?"批量录入分仓报价":"添加报价"}</button></div>`}
            ${list.length > 1 ? `<div class="comparison-list">${list.slice(1, 4).map((r, i) => renderOption(r, i + 2)).join("")}</div>` : ""}
            <div class="warning" style="margin-top:14px">结果用于询价比选。实际账单仍受海关归类、偏远仓、查验、超长超重、旺季附加费及 Amazon 最终入仓计划影响。</div>
          </div>
        </section>
      </div>
    </div>`;
  }

  function renderBest(r) {
    const parts = [r.freight, r.origin, r.destination, r.duty + r.vat, r.amazon, r.surcharge + r.insurance];
    return `<article class="best-card">
      <div class="best-top"><div><span class="best-badge">${r.split?"分仓合计总成本":"当前最低总成本"}</span><h3>${esc(r.q.carrier)}</h3><p>${esc(mode(r.q.modeId).name)} · ${r.split?`${r.legs.length} 个仓点逐仓计费`:BASIS_LABELS[r.q.basis]} · ${fmt(r.days,0)} 天</p></div><div class="best-price"><strong>${money(r.total)}</strong><span>≈ ${money(toLocal(r.total), localCurrency())} · ${money(r.perUnit, "CNY", 2)}/件</span></div></div>
      <div class="cost-track">${parts.map((v, i) => `<i style="width:${r.total ? v/r.total*100 : 0}%;background:${COLORS[i]}"></i>`).join("")}</div>
      <div class="cost-legend">${["主运费","起运费用","目的港/派送","关税/进口税","Amazon/AWD","附加/保险"].map((x,i)=>`<span><i style="background:${COLORS[i]}"></i>${x}</span>`).join("")}</div>
      <div class="breakdown"><div><span>主运费</span><b>${money(r.freight)}</b></div><div><span>清关与税费</span><b>${money(r.duty+r.vat)}</b></div><div><span>本地及派送</span><b>${money(r.origin+r.destination)}</b></div><div><span>Amazon / AWD</span><b>${money(r.amazon)}</b></div></div>
      ${r.split ? `<div class="split-breakdown"><b>各仓费用明细（相加计入总费用）</b>${r.legs.map((leg,index)=>`<div><span><i class="split-index">${index+1}</i><strong>${esc(leg.warehouse)}</strong> · ${fmt(leg.m.cartonCount,0)}箱 / ${fmt(leg.m.quantity,0)}件<br><small>${money(leg.q.rate,leg.q.currency,2)} · ${BASIS_LABELS[leg.q.basis]}</small></span><strong>${money(leg.total)}</strong></div>`).join("")}<div class="split-formula">${r.legs.map(leg=>money(leg.total)).join(" + ")} = <strong>${money(r.total)}</strong></div><div class="split-total"><span>整批货全部仓点合计</span><strong>${money(r.total)}</strong></div></div>` : ""}
    </article>`;
  }

  function renderOption(r, rank) {
    return `<div class="option-row ${rank===1?"best":""}"><span class="rank">${rank}</span><div class="option-name"><strong>${esc(r.q.carrier)}</strong><span>${esc(mode(r.q.modeId).name)} · ${esc(r.q.warehouse)}</span></div><div><span class="cell-main">${fmt(r.days,0)} 天</span><span class="cell-sub">${r.expired?"已过有效期":"有效至 "+r.q.validUntil}</span></div><div><div class="score"><i style="width:${Math.max(5,r.score)}%"></i></div><span class="cell-sub">综合分 ${r.score}</span></div><div class="price-cell"><strong>${money(r.total)}</strong><span class="cell-sub">${money(r.perUnit,"CNY",2)}/件</span></div></div>`;
  }

  function renderQuotes() {
    const qs = state.quotes.filter(q => (quoteFilter.market === "ALL" || q.market === quoteFilter.market) && (!quoteFilter.q || `${q.carrier} ${q.warehouse} ${mode(q.modeId).name}`.toLowerCase().includes(quoteFilter.q.toLowerCase())));
    return `<div class="toolbar"><div class="toolbar-group"><input class="search" id="quoteSearch" placeholder="搜索承运商、仓点或方式" value="${esc(quoteFilter.q)}"><select class="select" id="quoteMarket"><option value="ALL">全部站点</option><option value="US" ${quoteFilter.market==="US"?"selected":""}>美国站</option><option value="UK" ${quoteFilter.market==="UK"?"selected":""}>英国站</option></select></div><div class="toolbar-group"><button class="ghost" data-action="import">导入 JSON</button><button class="ghost" data-action="export-csv">导出 CSV</button><button class="ghost split-action" data-action="open-split-quote">⇉ 分仓批量报价</button><button class="primary" data-action="open-quote">＋ 添加报价</button></div></div>
      <section class="panel"><div class="panel-head"><div><h2>承运商报价库</h2><p>每条报价绑定站点、仓点、计费方式和有效期；仓点数量不受限制</p></div><span class="tag live">${state.quotes.filter(x=>!x.demo).length} 条自有报价</span></div>
      <div class="table-wrap"><table><thead><tr><th>承运商 / 方式</th><th>站点</th><th>仓点</th><th>计费</th><th>单价</th><th>时效</th><th>有效期</th><th></th></tr></thead><tbody>
      ${qs.map(q => `<tr><td><span class="cell-main">${esc(q.carrier)}</span><span class="cell-sub">${esc(mode(q.modeId).name)}</span></td><td>${MARKET[q.market].flag} ${MARKET[q.market].label}</td><td><b>${esc(q.warehouse)}</b></td><td>${BASIS_LABELS[q.basis]}</td><td><b>${money(q.rate,q.currency,2)}</b></td><td>${q.transitMin}-${q.transitMax} 天</td><td><span class="tag ${q.demo?"demo":"live"}">${q.demo?"演示 · ":""}${esc(q.validUntil||"未设置")}</span></td><td><div class="row-actions"><button class="icon-btn" title="编辑" data-action="edit-quote" data-id="${q.id}">✎</button><button class="icon-btn" title="复制" data-action="copy-quote" data-id="${q.id}">⧉</button><button class="icon-btn" title="删除" data-action="delete-quote" data-id="${q.id}">×</button></div></td></tr>`).join("") || `<tr><td colspan="8"><div class="empty-state"><h3>没有匹配报价</h3><p>调整筛选条件或添加一条新报价。</p></div></td></tr>`}
      </tbody></table></div></section>`;
  }

  function renderCompare() {
    const list = results(), splits = activeSplits();
    return `<section class="panel"><div class="panel-head"><div><h2>${esc(warehouseLabel())} 可行方案排序</h2><p>${splits.length>1?"各承运商的分仓费用已按仓点分别计算后相加。":"默认按含税总成本排序；"}综合分同时考虑成本、时效与数据完整度</p></div><button class="ghost mini" data-action="open-shipment">调整货件</button></div><div class="panel-body">
      <div class="summary-grid"><div class="metric"><span>有效方案</span><strong>${list.length}<em>个</em></strong></div><div class="metric"><span>最低总成本</span><strong>${list[0]?money(list[0].total):"—"}</strong></div><div class="metric"><span>最低单件头程</span><strong>${list[0]?money(list[0].perUnit,"CNY",2):"—"}</strong></div><div class="metric"><span>最快时效</span><strong>${list.length?fmt(Math.min(...list.map(x=>x.days)),0):"—"}<em>天</em></strong></div></div>
      ${list.length ? `<div class="comparison-list">${list.map((r,i)=>renderOption(r,i+1)).join("")}</div><div style="margin-top:16px">${renderBest(list[0])}</div>` : `<div class="empty-state"><div class="empty-icon">⇄</div><h3>暂无可比方案</h3><p>至少录入一条与当前站点和仓点匹配、单价大于 0 的报价。</p><button class="primary" data-action="open-quote">添加报价</button></div>`}
      </div></section>`;
  }

  function renderCatalog() {
    return `<div class="official"><div style="font-size:25px">ⓘ</div><div><b>运输产品内置规则，运价保持可编辑</b><p>Amazon 官方产品通常在 Seller Central 按具体货件动态报价。本工具不会把示例价格伪装成官方实时价；你可随时为任意仓点添加最新报价。</p></div></div>
      <div class="catalog-grid">${METHOD_CATALOG.map(m => `<article class="catalog-card"><div class="catalog-icon">${m.icon}</div><h3>${esc(m.name)}</h3><p>${esc(m.desc)}</p><footer><span class="tag ${m.owner==="Amazon"?"amazon":""}">${m.owner}</span><span class="tag">${esc(m.markets)}</span><span class="tag">${esc(m.basis)}</span></footer></article>`).join("")}</div>`;
  }

  function renderSettings() {
    const x = state.settings, s = state.shipment;
    return `<form id="settingsForm" class="settings-grid">
      <section class="panel"><div class="panel-head"><div><h2>换算与计费参数</h2><p>所有报价最终统一换算为人民币比较</p></div></div><div class="panel-body field-grid">
        ${field("美元兑人民币","usdCny",x.usdCny,"number","", "0.01")}${field("英镑兑人民币","gbpCny",x.gbpCny,"number","", "0.01")}
        ${field("空运体积系数","airDivisor",x.airDivisor,"number","cm³/kg")}${field("快递体积系数","expressDivisor",x.expressDivisor,"number","cm³/kg")}
        ${field("整柜可用率","fclUtilization",x.fclUtilization,"number","%")}
      </div></section>
      <section class="panel"><div class="panel-head"><div><h2>默认税费与保险</h2><p>税率会随商品 HS Code 改变，请按实调整</p></div></div><div class="panel-body field-grid">
        ${field("进口关税率","dutyRate",s.dutyRate,"number","%","0.01")}${field("进口 VAT / 税率","vatRate",s.vatRate,"number","%","0.01")}
        ${field("保险费率","insurancePct",s.insurancePct,"number","%","0.01")}${field("FBA 入库配置费","inboundPlacementFee",s.inboundPlacementFee,"number",localCurrency(),"0.01")}
        <div class="field full"><label><input style="width:auto;min-height:auto" type="checkbox" name="includeTaxes" ${s.includeTaxes?"checked":""}> 在总成本中计入估算关税与进口税</label></div>
      </div></section>
      <section class="panel" style="grid-column:1/-1"><div class="panel-head"><div><h2>AWD 费率基线 <span class="tag amazon">USD</span></h2><p>默认取自 Amazon 官方公开费率页（核对日期：2026-10-30），可随政策变化更新</p></div></div><div class="panel-body field-grid cols-3">
        ${field("入库处理 / 箱","awdInboundPerBox",x.awdInboundPerBox,"number","USD","0.01")}${field("运输 / cu ft","awdTransportBase",x.awdTransportBase,"number","USD","0.01")}${field("Managed 运输 / cu ft","awdTransportManaged",x.awdTransportManaged,"number","USD","0.01")}
        ${field("美西基础仓储 / cu ft/月","awdStorageWestBase",x.awdStorageWestBase,"number","USD","0.01")}${field("美西 Smart 仓储","awdStorageWestSmart",x.awdStorageWestSmart,"number","USD","0.01")}${field("美西 Managed 仓储","awdStorageWestManaged",x.awdStorageWestManaged,"number","USD","0.01")}
        ${field("其他区域基础仓储","awdStorageOtherBase",x.awdStorageOtherBase,"number","USD","0.01")}${field("其他区域 Smart 仓储","awdStorageOtherSmart",x.awdStorageOtherSmart,"number","USD","0.01")}${field("其他区域 Managed 仓储","awdStorageOtherManaged",x.awdStorageOtherManaged,"number","USD","0.01")}
      </div></section>
      <section class="panel" style="grid-column:1/-1"><div class="panel-head"><div><h2>数据管理</h2><p>报价与设置仅保存在当前浏览器，可导出备份</p></div></div><div class="panel-body"><div class="toolbar-group"><button type="submit" class="primary">保存参数</button><button type="button" class="ghost" data-action="export">导出完整 JSON</button><button type="button" class="ghost" data-action="import">导入备份</button><button type="button" class="danger" data-action="reset">恢复演示数据</button></div></div></section>
    </form>`;
  }

  function field(label, name, value, type = "text", suffix = "", step = "any") {
    return `<div class="field"><label>${label}</label><div class="input-suffix"><input name="${name}" type="${type}" step="${step}" value="${esc(value)}">${suffix?`<span>${suffix}</span>`:""}</div></div>`;
  }

  function renderAbout() {
    return `<div class="about-hero"><div><p class="eyebrow" style="color:#b8e8d5">DETERMINISTIC COST ENGINE</p><h2>可追溯的头程费用，而不是一个黑盒报价器</h2><p>每个结果都由货件体积、实重、计费重、承运商单价、固定费用、税费和 Amazon 费用逐项相加。报价变化时无需改计算逻辑。</p></div><div class="about-stat"><div><strong>${METHOD_CATALOG.length}</strong><span>运输方式模板</span></div><div><strong>2</strong><span>美国 / 英国站</span></div><div><strong>6</strong><span>计费基准</span></div><div><strong>∞</strong><span>承运商与仓点</span></div></div></div>
      <section class="panel" style="margin-top:16px"><div class="panel-head"><div><h2>核心计算口径</h2><p>同一货件在不同报价基准下自动切换</p></div></div><div class="panel-body"><div class="catalog-grid">
        <article class="catalog-card"><h3>体积与计费重</h3><p>CBM = 长×宽×高÷1,000,000×箱数；空运/快递计费重取实重与体积重较大者。</p><footer><span class="tag">cm → m³</span><span class="tag">max(实重,体积重)</span></footer></article>
        <article class="catalog-card"><h3>LCL 收费吨</h3><p>W/M 取总体积 CBM 与总重吨数中较大值，仍可叠加最低消费、文件费和目的港杂费。</p><footer><span class="tag">max(CBM, 吨)</span></footer></article>
        <article class="catalog-card"><h3>FCL 整柜</h3><p>按 20GP≈28CBM、40GP≈58CBM、40HQ≈68CBM 的可用容量与利用率估算所需柜数。</p><footer><span class="tag">可调整利用率</span></footer></article>
      </div></div></section>
      <section class="panel" style="margin-top:16px"><div class="panel-head"><div><h2>Amazon 官方依据</h2><p>产品范围来自 Amazon 官方页面；具体报价以 Seller Central 和承运商账单为准</p></div></div><div class="panel-body source-list">
        <div class="source-item"><div><b>Seller Export & Delivery (SEND)</b><div class="cell-sub">中国等起运国，通过空运或海运发往美国、英国等站点，可送 FBA / AWD</div></div><a href="https://sell.amazon.com/programs/seller-export-and-delivery" target="_blank" rel="noreferrer">打开官方页 ↗</a></div>
        <div class="source-item"><div><b>Amazon Warehousing and Distribution (AWD)</b><div class="cell-sub">大宗仓储、自动补货及运输/处理费用结构</div></div><a href="https://sell.amazon.com/programs/warehousing" target="_blank" rel="noreferrer">打开官方页 ↗</a></div>
        <div class="source-item"><div><b>Amazon Partnered Carrier Program</b><div class="cell-sub">美国境内 SPD、LTL、FTL 与 intermodal 入仓选项</div></div><a href="https://sellercentral.amazon.com/gp/help/external/G201119120" target="_blank" rel="noreferrer">打开官方页 ↗</a></div>
        <div class="source-item"><div><b>Amazon Global Logistics (AGL)</b><div class="cell-sub">中国至美国、英国及欧洲 Amazon 网络的海运方案</div></div><a href="https://sell.amazon.com/blog/cross-border-ecommerce" target="_blank" rel="noreferrer">打开官方页 ↗</a></div>
      </div></section>`;
  }

  function shipmentDialogHtml() {
    const s = state.shipment;
    const splitText = (s.splits || []).map(x => `${x.warehouse}, ${x.cartonCount}, ${x.quantity}`).join("\n");
    return `<form method="dialog" id="shipmentForm"><div class="modal-head"><h2>编辑货件参数</h2><button type="button" class="icon-btn" data-action="close-dialog">×</button></div>
      <div class="form-section"><h3><span>1</span>路线与履约</h3><div class="field-grid cols-3">
        <div class="field"><label>起运城市</label><input name="origin" value="${esc(s.origin)}"></div>
        <div class="field"><label>目的站点</label><select name="market"><option value="US" ${s.market==="US"?"selected":""}>美国站</option><option value="UK" ${s.market==="UK"?"selected":""}>英国站</option></select></div>
        <div class="field"><label>履约模式</label><select name="fulfillment"><option ${s.fulfillment==="FBA"?"selected":""}>FBA</option><option ${s.fulfillment==="FBM"?"selected":""}>FBM</option></select></div>
        <div class="field"><label>单仓目的仓点</label><input name="warehouse" value="${esc(s.warehouse)}" placeholder="ONT8 / BHX4 / 自定义"></div>
        <div class="field"><label>件数</label><input type="number" name="quantity" value="${s.quantity}"></div>
        <div class="field"><label>每箱件数</label><input type="number" name="unitsPerCarton" value="${s.unitsPerCarton}"></div>
      </div><div class="split-editor"><label><input type="checkbox" name="splitEnabled" ${s.splitEnabled?"checked":""}> 将整批货拆分到多个仓点，各仓费用分别计算后相加</label><div class="field"><label>分仓清单 <small>每行：仓点, 箱数, 件数</small></label><textarea name="splitText" placeholder="ONT8, 10, 240\nABE8, 6, 144\nFTW1, 4, 96">${esc(splitText)}</textarea></div></div></div>
      <div class="form-section"><h3><span>2</span>外箱数据</h3><div class="field-grid cols-3">
        ${dialogField("箱数","cartonCount",s.cartonCount,"箱")}${dialogField("外箱长","length",s.length,"cm")}${dialogField("外箱宽","width",s.width,"cm")}${dialogField("外箱高","height",s.height,"cm")}${dialogField("单箱毛重","cartonWeight",s.cartonWeight,"kg")}
        <div class="field"><label>整柜柜型</label><select name="containerType"><option ${s.containerType==="20GP"?"selected":""}>20GP</option><option ${s.containerType==="40GP"?"selected":""}>40GP</option><option ${s.containerType==="40HQ"?"selected":""}>40HQ</option></select></div>
      </div></div>
      <div class="form-section"><h3><span>3</span>申报与 Amazon 费用</h3><div class="field-grid cols-3">
        ${dialogField("单件申报价值","declaredUnitValue",s.declaredUnitValue,localCurrency())}${dialogField("关税率","dutyRate",s.dutyRate,"%")}${dialogField("VAT / 进口税率","vatRate",s.vatRate,"%")}${dialogField("保险率","insurancePct",s.insurancePct,"%")}${dialogField("入库配置费","inboundPlacementFee",s.inboundPlacementFee,localCurrency())}
        <div class="field"><label>税费</label><select name="includeTaxes"><option value="true" ${s.includeTaxes?"selected":""}>计入总成本</option><option value="false" ${!s.includeTaxes?"selected":""}>暂不计入</option></select></div>
        <div class="field full"><label><input type="checkbox" style="width:auto;min-height:auto" name="useAwd" ${s.useAwd?"checked":""}> 通过美国 AWD 中转并估算处理、存储与 AWD→FBA 运输</label></div>
        <div class="field"><label>AWD 区域</label><select name="awdRegion"><option value="west" ${s.awdRegion==="west"?"selected":""}>美西</option><option value="other" ${s.awdRegion==="other"?"selected":""}>美东/南部</option></select></div>
        <div class="field"><label>AWD 费率层级</label><select name="awdTier"><option value="base" ${s.awdTier==="base"?"selected":""}>基础</option><option value="smart" ${s.awdTier==="smart"?"selected":""}>Smart Storage</option><option value="managed" ${s.awdTier==="managed"?"selected":""}>Amazon Managed</option></select></div>
        ${dialogField("预计 AWD 存储","awdMonths",s.awdMonths,"月")}
      </div></div>
      <div class="form-actions"><button type="button" class="ghost" data-action="close-dialog">取消</button><button class="primary" value="default">保存并测算</button></div></form>`;
  }

  function dialogField(label, name, value, suffix) { return `<div class="field"><label>${label}</label><div class="input-suffix"><input type="number" step="any" name="${name}" value="${esc(value)}"><span>${suffix}</span></div></div>`; }

  function quoteDialogHtml(q) {
    q = q || { id:"", carrier:"", warehouse:state.shipment.warehouse, market:state.shipment.market, fulfillment:state.shipment.fulfillment, modeId:"sea_lcl", basis:"per_cbm", rate:"", currency:"CNY", minCharge:0, originFee:0, exportFee:0, docFee:0, destFee:0, deliveryFee:0, surchargePct:0, transitMin:20, transitMax:30, validUntil:todayPlus(30), note:"", enabled:true };
    return `<form method="dialog" id="quoteForm" data-id="${esc(q.id)}"><div class="modal-head"><h2>${q.id?"编辑":"添加"}承运商报价</h2><button type="button" class="icon-btn" data-action="close-dialog">×</button></div>
      <div class="form-section"><h3><span>1</span>报价标识</h3><div class="field-grid cols-3">
        <div class="field"><label>承运商 / 报价名称</label><input required name="carrier" value="${esc(q.carrier)}" placeholder="如：XX国际物流"></div>
        <div class="field"><label>目的站点</label><select name="market"><option value="US" ${q.market==="US"?"selected":""}>美国站</option><option value="UK" ${q.market==="UK"?"selected":""}>英国站</option></select></div>
        <div class="field"><label>仓点 <small>* 代表通用</small></label><input required name="warehouse" value="${esc(q.warehouse)}" placeholder="ONT8 / BHX4 / *"></div>
        <div class="field"><label>履约模式</label><select name="fulfillment"><option ${q.fulfillment==="FBA"?"selected":""}>FBA</option><option ${q.fulfillment==="FBM"?"selected":""}>FBM</option></select></div>
        <div class="field"><label>运输方式</label><select name="modeId">${METHOD_CATALOG.map(m=>`<option value="${m.id}" ${q.modeId===m.id?"selected":""}>${esc(m.name)}</option>`).join("")}</select></div>
        <div class="field"><label>计费基准</label><select name="basis">${Object.entries(BASIS_LABELS).map(([id,label])=>`<option value="${id}" ${q.basis===id?"selected":""}>${label}</option>`).join("")}</select></div>
      </div></div>
      <div class="form-section"><h3><span>2</span>主运费</h3><div class="field-grid cols-3">
        ${dialogField("单价","rate",q.rate,q.currency)}<div class="field"><label>币种</label><select name="currency"><option ${q.currency==="CNY"?"selected":""}>CNY</option><option ${q.currency==="USD"?"selected":""}>USD</option><option ${q.currency==="GBP"?"selected":""}>GBP</option></select></div>${dialogField("最低消费","minCharge",q.minCharge,q.currency)}
        ${dialogField("起运提货费","originFee",q.originFee,q.currency)}${dialogField("出口报关费","exportFee",q.exportFee,q.currency)}${dialogField("文件/订舱费","docFee",q.docFee,q.currency)}
        ${dialogField("目的港/清关杂费","destFee",q.destFee,q.currency)}${dialogField("末端派送费","deliveryFee",q.deliveryFee,q.currency)}${dialogField("燃油/旺季附加","surchargePct",q.surchargePct,"%")}
      </div></div>
      <div class="form-section"><h3><span>3</span>时效与有效性</h3><div class="field-grid cols-3">
        ${dialogField("最快时效","transitMin",q.transitMin,"天")}${dialogField("最慢时效","transitMax",q.transitMax,"天")}<div class="field"><label>报价有效至</label><input type="date" name="validUntil" value="${esc(q.validUntil)}"></div>
        <div class="field full"><label>备注 / 包含与不包含</label><textarea name="note" placeholder="例如：含税不包查验；偏远仓另询">${esc(q.note)}</textarea></div>
      </div></div>
      <div class="form-actions"><button type="button" class="ghost" data-action="close-dialog">取消</button><button class="primary" value="default">保存报价</button></div></form>`;
  }

  function splitQuoteDialogHtml() {
    const s = state.shipment;
    const rows = s.splitEnabled && Array.isArray(s.splits) && s.splits.length > 1
      ? s.splits.map(x => `${x.warehouse}, ${x.cartonCount}, ${x.quantity}, `).join("\n")
      : `ONT8, 10, 240, 3500\nABE8, 6, 144, 2800\nFTW1, 4, 96, 2200`;
    return `<form method="dialog" id="splitQuoteForm"><div class="modal-head"><div><h2>分仓批量报价</h2><p>一批货拆往多个仓点，每仓单独计费，最后自动相加</p></div><button type="button" class="icon-btn" data-action="close-dialog">×</button></div>
      <div class="split-banner"><strong>计算方式</strong><span>仓点 A 费用 + 仓点 B 费用 + … = 整批货总费用</span></div>
      <div class="form-section"><h3><span>1</span>承运商与计费规则</h3><div class="field-grid cols-3">
        <div class="field"><label>承运商 / 方案名称</label><input required name="carrier" placeholder="如：海星物流"></div>
        <div class="field"><label>目的站点</label><select name="market"><option value="US" ${s.market==="US"?"selected":""}>美国站</option><option value="UK" ${s.market==="UK"?"selected":""}>英国站</option></select></div>
        <div class="field"><label>履约模式</label><select name="fulfillment"><option ${s.fulfillment==="FBA"?"selected":""}>FBA</option><option ${s.fulfillment==="FBM"?"selected":""}>FBM</option></select></div>
        <div class="field"><label>运输方式</label><select name="modeId">${METHOD_CATALOG.map(m=>`<option value="${m.id}" ${m.id==="sea_lcl"?"selected":""}>${esc(m.name)}</option>`).join("")}</select></div>
        <div class="field"><label>报价含义</label><select name="basis"><option value="per_shipment" selected>每仓总价 / 包价</option><option value="per_cbm">每仓按方 / CBM</option><option value="per_kg">每仓按计费重 / kg</option><option value="wm">每仓 W/M 收费吨</option><option value="per_container">每仓按整柜</option><option value="per_carton">每仓按箱</option></select></div>
        <div class="field"><label>币种</label><select name="currency"><option>CNY</option><option>USD</option><option>GBP</option></select></div>
      </div></div>
      <div class="form-section"><h3><span>2</span>仓点、货量与报价</h3><div class="bulk-help"><b>每行填写：</b>仓点, 箱数, 件数, 该仓报价<br><small>仓点数量不限；例如每仓总价为 3,500 元时写 3500。若选择“按方”，则最后一列填写每方单价。</small></div><div class="field"><textarea class="split-rows" required name="rows" placeholder="ONT8, 10, 240, 3500\nABE8, 6, 144, 2800">${esc(rows)}</textarea></div></div>
      <div class="form-section"><h3><span>3</span>时效与有效期</h3><div class="field-grid cols-3">
        ${dialogField("最快时效","transitMin",20,"天")}${dialogField("最慢时效","transitMax",30,"天")}<div class="field"><label>报价有效至</label><input type="date" name="validUntil" value="${todayPlus(30)}"></div>
        <div class="field full"><label>备注</label><textarea name="note" placeholder="例如：每仓报价已含清关与派送；不含查验费">各仓点分别报价，系统按仓点计算后相加</textarea></div>
      </div></div>
      <div class="form-actions"><button type="button" class="ghost" data-action="close-dialog">取消</button><button class="primary" value="default">保存并计算分仓总费用</button></div></form>`;
  }

  function openShipment() { const d=document.getElementById("shipmentDialog"); d.innerHTML=shipmentDialogHtml(); d.showModal(); }
  function openQuote(id) { const d=document.getElementById("quoteDialog"); d.innerHTML=quoteDialogHtml(id?state.quotes.find(q=>q.id===id):null); d.showModal(); }
  function openSplitQuote() { const d=document.getElementById("splitQuoteDialog"); d.innerHTML=splitQuoteDialogHtml(); d.showModal(); }
  function closeDialogs() { document.querySelectorAll("dialog[open]").forEach(d=>d.close()); }

  function formObject(form) { return Object.fromEntries(new FormData(form).entries()); }
  function numericFields(obj, names) { names.forEach(k => obj[k] = num(obj[k])); return obj; }

  function submitShipment(form) {
    const o = formObject(form);
    numericFields(o,["quantity","unitsPerCarton","cartonCount","length","width","height","cartonWeight","declaredUnitValue","dutyRate","vatRate","insurancePct","inboundPlacementFee","awdMonths"]);
    o.includeTaxes = o.includeTaxes === "true"; o.useAwd = form.elements.useAwd.checked; o.splitEnabled = form.elements.splitEnabled.checked;
    const parsedSplits = String(o.splitText || "").split(/\r?\n/).map(line => {
      const parts = line.trim().split(/[,，\s]+/); return { warehouse: String(parts[0] || "").toUpperCase(), cartonCount: num(parts[1]), quantity: num(parts[2]) };
    }).filter(x => x.warehouse && x.cartonCount > 0 && x.quantity > 0);
    delete o.splitText;
    if (o.splitEnabled && parsedSplits.length >= 2) {
      o.splits = parsedSplits; o.warehouse = parsedSplits[0].warehouse;
      o.cartonCount = parsedSplits.reduce((t,x)=>t+x.cartonCount,0); o.quantity = parsedSplits.reduce((t,x)=>t+x.quantity,0);
    } else {
      o.splitEnabled = false; o.splits = [{ warehouse: o.warehouse.toUpperCase(), cartonCount: o.cartonCount, quantity: o.quantity }];
    }
    if (o.market !== state.shipment.market) {
      const d = MARKET[o.market]; o.dutyRate = d.duty; o.vatRate = d.vat;
    }
    state.shipment = { ...state.shipment, ...o }; save(); closeDialogs(); toast("货件参数已更新，费用已重新计算"); render();
  }

  function submitQuote(form) {
    const o = formObject(form); const id = form.dataset.id || uid();
    numericFields(o,["rate","minCharge","originFee","exportFee","docFee","destFee","deliveryFee","surchargePct","transitMin","transitMax"]);
    o.id=id; o.demo=false; o.enabled=true; o.warehouse=o.warehouse.trim().toUpperCase();
    const idx=state.quotes.findIndex(q=>q.id===id); if(idx>=0) state.quotes[idx]=o; else state.quotes.unshift(o);
    save(); closeDialogs(); toast(idx>=0?"报价已更新":"报价已加入动态报价库"); render();
  }

  function parseSplitQuoteRows(text) {
    return String(text || "").split(/\r?\n/).map((line, index) => {
      const parts = line.trim().split(/[,，\t]+/).map(x => x.trim());
      return { line: index + 1, warehouse: String(parts[0] || "").toUpperCase(), cartonCount: num(parts[1]), quantity: num(parts[2]), rate: num(String(parts[3] || "").replace(/[^\d.-]/g, "")) };
    }).filter(x => x.warehouse || x.cartonCount || x.quantity || x.rate);
  }

  function submitSplitQuote(form) {
    const o = formObject(form);
    numericFields(o,["transitMin","transitMax"]);
    const rows = parseSplitQuoteRows(o.rows);
    if (rows.length < 2 || rows.some(x => !x.warehouse || x.cartonCount <= 0 || x.quantity <= 0 || x.rate <= 0)) {
      toast("请至少填写 2 个仓点，并确保每行的仓点、箱数、件数和报价都有效");
      return;
    }
    const group = "split-" + uid();
    const warehouses = new Set(rows.map(x => x.warehouse));
    state.quotes = state.quotes.filter(q => q.demo || !(q.carrier === o.carrier.trim() && q.market === o.market && q.fulfillment === o.fulfillment && q.modeId === o.modeId && warehouses.has(q.warehouse)));
    rows.forEach(x => state.quotes.unshift({
      id:uid(), quoteGroup:group, carrier:o.carrier.trim(), warehouse:x.warehouse, market:o.market, fulfillment:o.fulfillment,
      modeId:o.modeId, basis:o.basis, rate:x.rate, currency:o.currency, minCharge:0, originFee:0, exportFee:0, docFee:0,
      destFee:0, deliveryFee:0, surchargePct:0, transitMin:o.transitMin, transitMax:o.transitMax,
      validUntil:o.validUntil, note:o.note, demo:false, enabled:true
    }));
    const splits = rows.map(x => ({warehouse:x.warehouse, cartonCount:x.cartonCount, quantity:x.quantity}));
    const marketDefaults = o.market !== state.shipment.market ? { dutyRate:MARKET[o.market].duty, vatRate:MARKET[o.market].vat } : {};
    state.shipment = {
      ...state.shipment, market:o.market, fulfillment:o.fulfillment, splitEnabled:true, splits, warehouse:splits[0].warehouse,
      cartonCount:splits.reduce((t,x)=>t+x.cartonCount,0), quantity:splits.reduce((t,x)=>t+x.quantity,0), ...marketDefaults
    };
    state.page="agent"; save(); closeDialogs(); render();
    const result = results().find(r => r.q.quoteGroup === group) || results().find(r => r.q.carrier === o.carrier.trim());
    toast(result ? `${rows.length} 个仓点已合计：${money(result.total)}` : `${rows.length} 个仓点报价已保存`);
  }

  function parseChat(text) {
    const s = { ...state.shipment }; const changes=[]; let quoteCount=0;
    const hasQuoteIntent = /报价|元\s*\/(?:方|kg|公斤|柜|票)|美元\s*\//i.test(text);
    if (/美国|美站|\bUS\b/i.test(text)) { s.market="US"; s.dutyRate=5; s.vatRate=0; changes.push("目的站点：美国"); }
    if (/英国|英站|\bUK\b/i.test(text)) { s.market="UK"; s.dutyRate=4; s.vatRate=20; changes.push("目的站点：英国"); }
    if (/\bFBA\b/i.test(text)) { s.fulfillment="FBA"; changes.push("履约：FBA"); }
    if (/\bFBM\b/i.test(text)) { s.fulfillment="FBM"; changes.push("履约：FBM"); }
    const dim=text.match(/(\d+(?:\.\d+)?)\s*[x×*]\s*(\d+(?:\.\d+)?)\s*[x×*]\s*(\d+(?:\.\d+)?)\s*(?:cm|厘米)?/i);
    if(dim){ s.length=num(dim[1]);s.width=num(dim[2]);s.height=num(dim[3]);changes.push(`外箱：${s.length}×${s.width}×${s.height}cm`); }
    const kg=text.match(/(?:每箱|箱重|毛重)?\s*(\d+(?:\.\d+)?)\s*(?:kg|公斤)\s*(?:\/\s*箱|每箱)?/i);
    if(kg){ s.cartonWeight=num(kg[1]);changes.push(`箱重：${s.cartonWeight}kg`); }
    const boxes=text.match(/(?:共|总共|合计)?\s*(\d+)\s*箱/);
    if(boxes){ s.cartonCount=num(boxes[1]);changes.push(`箱数：${s.cartonCount}`); }
    const qty=text.match(/(?:共|合计|总计)?\s*(\d+)\s*(?:件|个|pcs)/i);
    if(qty){ s.quantity=num(qty[1]);changes.push(`件数：${s.quantity}`); }
    const origin=text.match(/(?:从|起运地|产地)[：:\s]*([\u4e00-\u9fa5]{2,6})(?:发|出|到|至|，|,|\s)/);
    if(origin){ s.origin=origin[1];changes.push(`起运地：${s.origin}`); }
    const codes=[...new Set([...text.toUpperCase().matchAll(/\b([A-Z]{3,4}\d)\b/g)].map(x=>x[1]).filter(x=>!["FBA","FBM"].includes(x)))];
    const splitMatches=[...text.matchAll(/\b([A-Z]{3,4}\d)\b[^\d]{0,10}(\d+)\s*箱(?:[^\d]{0,10}(\d+)\s*件)?/gi)];
    const chatSplits=splitMatches.map(x=>({warehouse:x[1].toUpperCase(),cartonCount:num(x[2]),quantity:num(x[3])})).filter(x=>x.cartonCount>0 && x.quantity>0);
    if(chatSplits.length>=2 && (/分仓|拆分|分别|不同仓/.test(text) || !hasQuoteIntent)){
      s.splitEnabled=true;s.splits=chatSplits;s.warehouse=chatSplits[0].warehouse;
      s.cartonCount=chatSplits.reduce((t,x)=>t+x.cartonCount,0);s.quantity=chatSplits.reduce((t,x)=>t+x.quantity,0);
      changes.push(`分仓：${chatSplits.map(x=>`${x.warehouse} ${x.cartonCount}箱/${x.quantity}件`).join("；")}`);
    } else if(codes.length && !hasQuoteIntent){ s.splitEnabled=false;s.warehouse=codes[0];s.splits=[{warehouse:s.warehouse,cartonCount:s.cartonCount,quantity:s.quantity}];changes.push(`当前目的仓：${s.warehouse}`); }

    const carrierMatch=text.match(/(?:添加报价|报价|承运商)[：:\s]*([^\s,，:：]+(?:物流|供应链|国际|货代)?)/);
    const carrier=carrierMatch?carrierMatch[1]:"对话录入承运商";
    if(hasQuoteIntent && codes.length){
      const quoteGroup = codes.length > 1 ? "chat-" + uid() : "";
      codes.forEach((code, index) => {
        const start=text.toUpperCase().indexOf(code); const segment=text.slice(start, index+1<codes.length?text.toUpperCase().indexOf(codes[index+1]):undefined);
        const rateMatch=segment.match(/(\d+(?:\.\d+)?)\s*(元|人民币|美元|美金|英镑)?\s*\/(方|CBM|KG|公斤|柜|票)/i)
          || segment.match(/(?:报价|总价|包价)[：:\s]*(\d+(?:\.\d+)?)\s*(元|人民币|美元|美金|英镑)?/i);
        if(!rateMatch) return;
        const unit=(rateMatch[3] || "票").toLowerCase();
        const basis=/方|cbm/.test(unit)?"per_cbm":/kg|公斤/.test(unit)?"per_kg":/柜/.test(unit)?"per_container":"per_shipment";
        const currency=/美元|美金/.test(rateMatch[2]||"")?"USD":/英镑/.test(rateMatch[2]||"")?"GBP":"CNY";
        const days=segment.match(/(\d+)\s*[-~至到]\s*(\d+)\s*天/) || text.match(/(\d+)\s*[-~至到]\s*(\d+)\s*天/);
        const modeId=/空运/.test(text)?"air":/快递/.test(text)?"express":/整柜|FCL/i.test(text)?"sea_fcl":/SEND/i.test(text)?"send_ocean":/AGL/i.test(text)?"agl_lcl":/铁路|班列/.test(text)?"rail":"sea_lcl";
        state.quotes.unshift({id:uid(),quoteGroup,carrier,warehouse:code,market:s.market,fulfillment:s.fulfillment,modeId,basis,rate:num(rateMatch[1]),currency,minCharge:0,originFee:0,exportFee:0,docFee:0,destFee:0,deliveryFee:0,surchargePct:0,transitMin:days?num(days[1]):20,transitMax:days?num(days[2]):30,validUntil:todayPlus(30),note:"通过对话录入，请补充固定费与报价范围",demo:false,enabled:true}); quoteCount++;
      });
    }
    state.shipment=s;
    const r=results()[0];
    let response="";
    if(changes.length) response += "已更新：\n• "+changes.join("\n• ")+"\n\n";
    if(quoteCount) response += `已识别并新增 ${quoteCount} 条仓点报价。${s.splitEnabled&&activeSplits().length>1?"同一方案会逐仓计算，并将各仓费用相加为整批总费用。":"固定费用暂按 0 计算，可到“动态报价库”补充。"}\n\n`;
    if(/比较|测算|多少钱|费用|方案/.test(text) || changes.length || quoteCount) {
      const mm=shipmentMetrics(); response += `货件换算：${fmt(mm.cbm,3)} CBM，实重 ${fmt(mm.actualKg,1)} kg，空运计费重 ${fmt(mm.chargeKg,1)} kg。`;
      response += r ? `\n当前最低方案为「${r.q.carrier}」，估算总成本 ${money(r.total)}，约 ${money(r.perUnit,"CNY",2)}/件，时效 ${fmt(r.days,0)} 天。` : "\n当前没有匹配且单价有效的报价，请继续提供承运商报价。";
    }
    if(!response) response="我暂未识别出可计算字段。可以按“外箱尺寸 + 箱重 + 箱数 + 件数 + 站点仓点”的格式告诉我，或直接粘贴多个仓点的报价。";
    return response;
  }

  function sendChat(text) {
    text=text.trim(); if(!text)return;
    state.messages.push({role:"user",text,time:new Date().toLocaleTimeString("zh-CN",{hour:"2-digit",minute:"2-digit"})});
    const reply=parseChat(text);
    state.messages.push({role:"agent",text:reply,time:"刚刚"}); save(); render();
  }

  function exportJson() {
    const payload={version:1,exportedAt:new Date().toISOString(),state,computed:results().map(r=>({carrier:r.q.carrier,warehouse:r.q.warehouse,totalCny:r.total,perUnitCny:r.perUnit,transitDays:r.days}))};
    download(`头程费用方案-${state.shipment.warehouse}.json`,JSON.stringify(payload,null,2),"application/json"); toast("完整方案已导出");
  }
  function exportCsv() {
    const headers=["承运商","市场","仓点","履约","运输方式","计费基准","单价","币种","最低消费","起运费","出口报关费","文件费","目的港费","派送费","附加费%","最快天数","最慢天数","有效期","备注"];
    const rows=state.quotes.map(q=>[q.carrier,q.market,q.warehouse,q.fulfillment,mode(q.modeId).name,BASIS_LABELS[q.basis],q.rate,q.currency,q.minCharge,q.originFee,q.exportFee,q.docFee,q.destFee,q.deliveryFee,q.surchargePct,q.transitMin,q.transitMax,q.validUntil,q.note]);
    const csv="\ufeff"+[headers,...rows].map(row=>row.map(v=>`"${String(v??"").replace(/"/g,'""')}"`).join(",")).join("\n"); download("头程承运商报价库.csv",csv,"text/csv"); toast("报价库 CSV 已导出");
  }
  function download(name,content,type){const a=document.createElement("a");a.href=URL.createObjectURL(new Blob([content],{type}));a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(a.href),500);}
  function toast(msg){const el=document.getElementById("toast");el.textContent=msg;el.classList.add("show");clearTimeout(toast.t);toast.t=setTimeout(()=>el.classList.remove("show"),2600);}
  function reset(){if(!confirm("将清除当前浏览器中的自有报价和设置，恢复演示数据。继续吗？"))return;state=defaultState();save();render();toast("已恢复演示数据");}

  document.addEventListener("click", e => {
    const page=e.target.closest("[data-page]"); if(page){state.page=page.dataset.page;save();render();return;}
    const el=e.target.closest("[data-action]"); if(!el)return;
    const action=el.dataset.action;
    if(action==="open-shipment")openShipment();
    if(action==="open-quote")openQuote();
    if(action==="open-split-quote")openSplitQuote();
    if(action==="edit-quote")openQuote(el.dataset.id);
    if(action==="close-dialog")closeDialogs();
    if(action==="clear-chat"){state.messages=defaultState().messages;save();render();}
    if(action==="copy-quote"){const q=state.quotes.find(x=>x.id===el.dataset.id);if(q){state.quotes.unshift({...q,id:uid(),carrier:q.carrier+"（副本）",demo:false});save();render();toast("报价已复制");}}
    if(action==="delete-quote"){if(confirm("删除这条报价？")){state.quotes=state.quotes.filter(q=>q.id!==el.dataset.id);save();render();toast("报价已删除");}}
    if(action==="export")exportJson();
    if(action==="export-csv")exportCsv();
    if(action==="import")document.getElementById("importInput").click();
    if(action==="reset")reset();
    if(el.dataset.prompt){const input=document.getElementById("chatInput");if(input){input.value=el.dataset.prompt;input.focus();}}
  });

  document.addEventListener("submit", e => {
    e.preventDefault();
    if(e.target.id==="chatForm")sendChat(document.getElementById("chatInput").value);
    if(e.target.id==="shipmentForm")submitShipment(e.target);
    if(e.target.id==="quoteForm")submitQuote(e.target);
    if(e.target.id==="splitQuoteForm")submitSplitQuote(e.target);
    if(e.target.id==="settingsForm"){
      const o=formObject(e.target);numericFields(o,["usdCny","gbpCny","airDivisor","expressDivisor","fclUtilization","dutyRate","vatRate","insurancePct","inboundPlacementFee","awdInboundPerBox","awdTransportBase","awdTransportManaged","awdStorageWestBase","awdStorageWestSmart","awdStorageWestManaged","awdStorageOtherBase","awdStorageOtherSmart","awdStorageOtherManaged"]);
      state.settings={...state.settings,usdCny:o.usdCny,gbpCny:o.gbpCny,airDivisor:o.airDivisor,expressDivisor:o.expressDivisor,fclUtilization:o.fclUtilization,awdInboundPerBox:o.awdInboundPerBox,awdTransportBase:o.awdTransportBase,awdTransportManaged:o.awdTransportManaged,awdStorageWestBase:o.awdStorageWestBase,awdStorageWestSmart:o.awdStorageWestSmart,awdStorageWestManaged:o.awdStorageWestManaged,awdStorageOtherBase:o.awdStorageOtherBase,awdStorageOtherSmart:o.awdStorageOtherSmart,awdStorageOtherManaged:o.awdStorageOtherManaged};
      state.shipment={...state.shipment,dutyRate:o.dutyRate,vatRate:o.vatRate,insurancePct:o.insurancePct,inboundPlacementFee:o.inboundPlacementFee,includeTaxes:e.target.elements.includeTaxes.checked};save();render();toast("参数已保存");
    }
  });

  document.addEventListener("input", e => {
    if(e.target.id==="quoteSearch"){quoteFilter.q=e.target.value;const p=e.target.selectionStart;render();const n=document.getElementById("quoteSearch");if(n){n.focus();n.setSelectionRange(p,p);}}
  });
  document.addEventListener("change", e => {
    if(e.target.id==="quoteMarket"){quoteFilter.market=e.target.value;render();}
  });
  document.getElementById("importInput").addEventListener("change", e => {
    const file=e.target.files[0];if(!file)return;const reader=new FileReader();reader.onload=()=>{try{const x=JSON.parse(reader.result);const imported=x.state||x;if(!imported.shipment||!Array.isArray(imported.quotes))throw new Error();state=imported;save();render();toast("备份已导入");}catch(_){toast("无法导入：文件格式不正确");}};reader.readAsText(file);e.target.value="";
  });
  document.getElementById("exportBtn").addEventListener("click",exportJson);
  document.getElementById("resetDemo").addEventListener("click",reset);
  render();
})();
