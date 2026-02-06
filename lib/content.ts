export const content = {
  en: {
    nav: {
      game: "Game",
      rules: "Mechanics",
      docs: "Whitepaper",
      connect: "Connect"
    },
    hero: {
      tagline: "Mainnet Live v1.0",
      title_prefix: "DRIFT",
      title_suffix: "PROTOCOL",
      subtitle_1: "The perpetual countdown lottery engine.",
      subtitle_2: "Every transaction warps time.",
      cta: "HOW TO PLAY"
    },
    game: {
      win_rate: "Win Rate Logic",
      win_rate_desc: "Base: 0.5% | Buy: +0.2% | Sell: Reset to 0 | Max: 5.0%",
      live_feed: "Live Feed",
      buy: "BUY",
      sell: "SELL",
      buy_desc: "Accelerate",
      sell_desc: "Delay",
      time_minus: "Time -1m",
      time_plus: "Time +1m",
      rate_plus_2: "Rate +0.2%",
      rate_plus_0: "Rate Reset 0",
      prize_pool: "Prize Pool",
      burst_rate: "Burst Rate",
      live_status: "Live Status",
      players: "Players",
      round: "Round",
      system_ok: "System Operational"
    },
    rules: {
      flywheel_title: "THE FLYWHEEL",
      flywheel_desc_1: "Every trade (3% Fee) feeds the pool.",
      flywheel_desc_2: "Buys speed up time. Sells slow it down.",
      flywheel_desc_3: "Larger Pool → More Volume → Faster Clock → Cycle Accelerates.",
      
      countdown_title: "Dynamic Countdown",
      countdown_desc: "Time is not linear. It is warped by volume.",
      countdown_buy: "Every BUY accelerates draw",
      countdown_sell: "Every SELL delays draw",
      
      burst_title: "Burst Rate Logic",
      burst_desc: "Frequency determines probability. Sellers get punished.",
      burst_base: "Base Rate",
      burst_buy: "Buy Bonus",
      burst_sell: "Sell Penalty",
      burst_cap: "Maximum Cap",
      
      prize_title: "Prize Distribution",
      prize_grand: "Grand Prize",
      prize_minor: "Minor Prize",
      prize_sun: "Sunshine",
      prize_roll: "Rollover",
      prize_note: "* 50% rolls over to ensure the pool always grows.",
      
      antibot_title: "Anti-Bot System",
      antibot_cool: "Cooling System",
      antibot_cool_desc: "Countdown effect decays exponentially:",
      antibot_valid: "Valid Transaction",
      antibot_valid_list: [
        "Min Value ≥ 20U",
        "5m Batch Processing",
        "Self-trade excluded",
        "Daily Cap +5%"
      ]
    },
    docs: {
      title: "Drift Protocol Whitepaper",
      sections: [
        {
          title: "1. Core Mechanism Summary",
          content: "The mechanism is driven by a 3% transaction fee injected into the lottery pool. Buy orders accelerate the countdown, while sell orders delay it. This creates a positive flywheel: Larger Pool → More Buys → Faster Countdown → Earlier Draw → Higher Participation → More Volume → More Fees → Larger Pool + Deflation → Price Support → Cycle Accelerates."
        },
        {
          title: "2. Dynamic Countdown (Core Game Theory)",
          content: "The countdown is the heartbeat of the ecosystem. \n- Initial: 100 minutes. \n- Buy: -1 minute. \n- Sell: +1 minute. \n- Cap: Max 200 minutes. \n- Trigger: Draw happens immediately at 0."
        },
        {
          title: "3. Draw & Reset",
          content: "When countdown hits 0: \n- Draw executes immediately. \n- New cycle starts at 100m. \n- 50% of the pool rolls over to the next round to ensure perpetual growth."
        },
        {
          title: "4. Burst Rate (Win Probability)",
          content: "Win rate = Base (0.5%) + Bonus. \n- Buy: +0.2% per tx. \n- Sell: RESET TO 0 (Penalty). \n- Cap: 5.0%. \n- Validity: Resets every round."
        },
        {
          title: "5. Distribution",
          content: "Requirements: At least 1 valid tx & Holding ≥ 500,000 tokens. \n- 30% Grand Prize (1 winner) \n- 15% Minor Prize (Multiple winners) \n- 5% Sunshine (All participants) \n- 50% Rollover (Next pool)"
        },
        {
          title: "6. Fairness & Anti-Bot",
          content: "- Valid Tx: ≥ 20U. \n- Batching: Multiple txs in 5m count as 1. \n- Self-trade: Excluded. \n- Cooling: Consecutive buys decay (-1m, -0.5m, -0.25m...)."
        }
      ]
    }
  },
  zh: {
    nav: {
      game: "博弈",
      rules: "机制",
      docs: "白皮书",
      connect: "连接钱包"
    },
    hero: {
      tagline: "主网已上线 v1.0",
      title_prefix: "漂流",
      title_suffix: "协议",
      subtitle_1: "永续倒计时博弈引擎。",
      subtitle_2: "每一笔交易都在扭曲时间。",
      cta: "玩法详解"
    },
    game: {
      win_rate: "爆率机制",
      win_rate_desc: "基础: 0.5% | 买: +0.2% | 卖: 归零 | 上限: 5.0%",
      live_feed: "实时战况",
      buy: "买入",
      sell: "卖出",
      buy_desc: "加速开奖",
      sell_desc: "延缓开奖",
      time_minus: "时间 -1分",
      time_plus: "时间 +1分",
      rate_plus_2: "爆率 +0.2%",
      rate_plus_0: "爆率 归零",
      prize_pool: "当前奖池",
      burst_rate: "当前爆率",
      live_status: "运行状态",
      players: "参与人数",
      round: "轮次",
      system_ok: "系统正常运行中"
    },
    rules: {
      flywheel_title: "正向飞轮",
      flywheel_desc_1: "每笔买卖 (3% 手续费) 全部注入奖池。",
      flywheel_desc_2: "买单加速倒计时，卖单延缓倒计时。",
      flywheel_desc_3: "奖池越厚 → 交易越多 → 开奖越快 → 循环加速。",
      
      countdown_title: "动态倒计时",
      countdown_desc: "时间不再是线性的，它被交易量所扭曲。",
      countdown_buy: "每笔 买单 加速开奖",
      countdown_sell: "每笔 卖单 延缓开奖",
      
      burst_title: "爆率机制",
      burst_desc: "不仅仅是持有，交易频率决定中奖概率。",
      burst_base: "基础爆率",
      burst_buy: "买单加成",
      burst_sell: "卖单惩罚",
      burst_cap: "每日上限",
      
      prize_title: "奖池分配",
      prize_grand: "大奖",
      prize_minor: "小奖",
      prize_sun: "阳光普照",
      prize_roll: "滚存下期",
      prize_note: "* 50% 滚存至下一轮，确保奖池永远处于增厚趋势。",
      
      antibot_title: "防刷系统",
      antibot_cool: "冷却机制",
      antibot_cool_desc: "连续交易的倒计时效果指数衰减：",
      antibot_valid: "有效交易定义",
      antibot_valid_list: [
        "单笔金额 ≥ 20U",
        "5分钟内多笔合并计算",
        "自买自卖不计入",
        "每日爆率上限 +5%"
      ]
    },
    docs: {
      title: "漂流协议白皮书",
      sections: [
        {
          title: "一、核心机制总述",
          content: "本机制以交易手续费驱动奖池、买卖行为博弈倒计时、爆率激励交易为核心，构建 “奖池增厚→买单增多→倒计时加速→开奖前置→参与意愿提升→交易规模扩大→手续费增加→奖池滚存 + 代币通缩→价格支撑” 的正向循环飞轮。\n\n每笔代币买卖交易统一收取 3% 手续费，全额注入抽奖奖池；初始倒计时 100 分钟，买单加速、卖单延缓，倒计时归 0 即开奖。"
        },
        {
          title: "二、动态倒计时博弈机制",
          content: "倒计时为生态核心博弈指标，由全网有效买卖单动态驱动：\n\n• 初始值：100 分钟\n• 调整规则：每 1 笔有效买单 -1 分钟；每 1 笔有效卖单 +1 分钟\n• 上限约束：最高 200 分钟\n• 开奖触发：归 0 立即开奖"
        },
        {
          title: "三、开奖与周期重置",
          content: "开奖是周期的收尾节点：\n\n• 触发条件：倒计时归 0\n• 周期重置：新周期倒计时重置为 100 分钟\n• 奖池滚存：未分配金额的 50% 全额滚入下一期，实现奖池无限增厚。"
        },
        {
          title: "四、阶梯式爆率激励机制",
          content: "爆率 = 基础爆率 + 交易加成爆率。\n\n• 基础爆率：0.5%（无门槛）\n• 买单加成：每笔 +0.2%\n• 卖单惩罚：每笔 爆率归零\n• 上限约束：最高 5%\n• 有效期：仅当前周期有效，开奖后重置。"
        },
        {
          title: "五、抽奖分配规则",
          content: "参与条件：\n1. 当前周期至少 1 笔有效交易\n2. 持币 ≥ 500,000 枚\n\n分配比例：\n• 30% 大奖（1人）\n• 15% 小奖（多人）\n• 5% 阳光普照（未中奖者均分）\n• 50% 滚存下一期"
        },
        {
          title: "六、防刷与公平性保障",
          content: "• 有效交易：单笔 ≥ 20U，5分钟内多笔合并。\n• 倒计时冷却：连续买单效果衰减（-1m, -0.5m, -0.25m...）。\n• 爆率冷却：单日上限 +5%。"
        }
      ]
    }
  }
}
