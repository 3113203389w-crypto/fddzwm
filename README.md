# 跨境头程费用 Agent

面向中国 Amazon 卖家的 FBA / FBM 头程物流费用测算工具，覆盖美国站、英国站、Amazon 官方物流产品及第三方承运商动态报价。

## 已实现

- 自然语言录入货件：外箱尺寸、箱重、箱数、件数、站点、仓点和履约方式
- 多仓点报价解析：一条对话可同时录入 ONT8、ABE8、FTW1 等任意数量仓点
- 分仓合并计费：整批货可拆到任意数量仓点；一次批量录入每仓箱数、件数与报价，逐仓计算后相加为整批总费用
- 参考汇率状态：页面打开时自动刷新 USD/CNY、GBP/CNY 每日参考汇率，显示数据来源、更新时间与失败回退状态
- 官方规则修正：美国关税基础不含国际运保费；AWD 入库/出库处理分别计费且经 AWD 补货不重复收取 FBA 入库配置费；FCL 使用标准物理柜容再乘装载率
- AWD 费率日期：2027-02-01 起按 Amazon 公布的新处理与运输费、燃油物流附加费测算；2027-03-01 起对超过 12 个月的库存估算高龄仓储费
- 计费基准：按 CBM、计费重 kg、W/M 收费吨、整柜、箱、票
- LCL / FCL：支持 20GP、40GP、40HQ 与可调整柜容利用率
- Amazon 方案：SEND 空/海运、AGL LCL/FCL、AWD、GWD、Partnered Carrier SPD/LTL/FTL、FFO、卖家自选承运商
- 第三方方案：国际快递、空运专线、海运快船、普船、LCL/FCL、铁路、卡航
- 费用拆分：起运、报关、主运费、文件费、目的港、清关/派送、附加费、保险、关税、进口 VAT、Amazon/AWD
- 多方案对比、报价有效期、币种换算、JSON 备份与 CSV 报价导出

## 本地运行

这是无构建依赖的静态应用。用任意静态 HTTP 服务器托管 `dist/` 即可：

```bash
python -m http.server 4173 --directory dist
```

数据保存在浏览器 `localStorage`。生产使用前请导入或录入真实承运商报价，并按产品 HS Code 调整关税率。

## 重要口径

Amazon SEND、AGL 等通常按具体货件在 Seller Central 动态报价，项目仅内置产品与计算规则，不伪造官方实时运价。AWD 当前费率与已公布的 2027 年费率来自 [Amazon Seller Central 官方说明](https://sellercentral.amazon.com/help/hub/reference/external/GAYG62Q3MPE6STFS)；最终优惠资格及可变附加费以 Seller Central 为准。汇率来自 [ExchangeRate-API 每日参考数据](https://www.exchangerate-api.com/docs/free)，不作为海关或银行结算汇率。
