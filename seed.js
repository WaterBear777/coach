/* 自动生成，来源：训练打卡手册v17 + 训练状态引擎v7 + 引擎导入_2026-11-09_双进阶校准.json */
var __G = (typeof window !== 'undefined' ? window : globalThis);
__G.SEED = {
 "config": {
  "version": 3,
  "profile": {
   "name": "",
   "sex": "m",
   "age": 32,
   "startWeight": 73.5,
   "targetWeight": "78-80",
   "kcal": "2650-2800",
   "protein": "150-160",
   "experience": "中阶（三大项约400kg）"
  },
  "rules": {
   "mode": "double",
   "deload": "manual",
   "deloadEveryWeeks": 4,
   "deloadFactor": 0.75,
   "stallSessions": 3,
   "backoff": 1,
   "upperInc": 2.5,
   "lowerInc": 5
  },
  "schedule": {
   "1": "Day1",
   "2": "Day2",
   "3": "Day3",
   "4": "Day4",
   "5": "Day5",
   "6": null,
   "0": null
  },
  "posingDays": [
   0,
   3
  ],
  "days": [
   {
    "id": "Day1",
    "dow": 1,
    "label": "Day 1",
    "name": "胸（主）+ 肩侧束"
   },
   {
    "id": "Day2",
    "dow": 2,
    "label": "Day 2",
    "name": "背（划船·厚度）"
   },
   {
    "id": "Day3",
    "dow": 3,
    "label": "Day 3",
    "name": "腿（单腿为主）"
   },
   {
    "id": "Day4",
    "dow": 4,
    "label": "Day 4",
    "name": "胸（次）+ 肩"
   },
   {
    "id": "Day5",
    "dow": 5,
    "label": "Day 5",
    "name": "背（下拉·宽度）+ 泵感"
   }
  ],
  "exercises": [
   {
    "id": "d1_smith",
    "name": "上斜史密斯卧推 15-20° ★",
    "day": "Day1",
    "w": 65.0,
    "unit": "kg",
    "lo": 6,
    "hi": 10,
    "inc": 5.0,
    "sets": 4,
    "type": "main",
    "star": true,
    "note": "基线65kg；安全销设胸上沿；组间2.5分钟；主项永不力竭",
    "group": "胸",
    "groups": [
     "胸"
    ],
    "rest": "2.5分钟",
    "mode": "load"
   },
   {
    "id": "d1_seated_press",
    "name": "坐姿平推（座椅调低1-2档，落点中上胸）",
    "day": "Day1",
    "w": 52.5,
    "unit": "kg",
    "lo": 8,
    "hi": 12,
    "inc": 2.5,
    "sets": 3,
    "type": "acc",
    "star": false,
    "note": "替换坏掉的对握上斜器械；不过度挺腰",
    "group": "胸",
    "groups": [
     "胸"
    ],
    "rest": "2分钟",
    "mode": "load"
   },
   {
    "id": "d1_dip",
    "name": "双杠臂屈伸",
    "day": "Day1",
    "w": null,
    "unit": "自重",
    "lo": 10,
    "hi": 15,
    "inc": 5,
    "sets": 2,
    "type": "acc",
    "star": false,
    "note": "身体前倾含胸，自重全组15次后再负重",
    "group": "胸",
    "groups": [
     "胸"
    ],
    "rest": "1.5分钟",
    "mode": "bodyweight"
   },
   {
    "id": "d1_lateral",
    "name": "器械/绳索侧平举（单臂）★",
    "day": "Day1",
    "w": 10.0,
    "unit": "kg",
    "lo": 8,
    "hi": 15,
    "inc": 1.0,
    "sets": 4,
    "type": "main",
    "star": true,
    "note": "小肌群不抢加重，8-15宽区间慢慢爬",
    "group": "肩侧",
    "groups": [
     "肩侧"
    ],
    "rest": "1.5分钟",
    "mode": "load",
    "link": "lateral"
   },
   {
    "id": "d1_abs",
    "name": "卷腹机/绳索卷腹",
    "day": "Day1",
    "w": null,
    "unit": "中档",
    "lo": 10,
    "hi": 15,
    "inc": 2.0,
    "sets": 3,
    "type": "iso",
    "star": false,
    "note": "只练腹直肌，不负重侧屈（护腰）",
    "group": "腹",
    "groups": [
     "腹"
    ],
    "rest": "1分钟",
    "mode": "untracked"
   },
   {
    "id": "d2_neutral_row",
    "name": "窄对握器械划船（胸托挂片）★",
    "day": "Day2",
    "w": 60.0,
    "unit": "kg(单边)",
    "lo": 6,
    "hi": 12,
    "inc": 2.5,
    "sets": 4,
    "type": "main",
    "star": true,
    "note": "肘贴身，沿肩伸展线拉",
    "group": "背",
    "groups": [
     "背"
    ],
    "rest": "2.5分钟",
    "mode": "load"
   },
   {
    "id": "d2_cable_seated_row",
    "name": "坐姿绳索划船（宽握正握）",
    "day": "Day2",
    "w": 59.5,
    "unit": "kg",
    "lo": 8,
    "hi": 12,
    "inc": 2.5,
    "sets": 3,
    "type": "acc",
    "star": false,
    "note": "肘外展约45°拉向上胸；底部送肩拉伸、顶端停1秒、躯干不后仰",
    "group": "背",
    "groups": [
     "背"
    ],
    "rest": "2分钟",
    "mode": "load"
   },
   {
    "id": "d2_cable_row",
    "name": "绳索单手划船",
    "day": "Day2",
    "w": 44.5,
    "unit": "kg",
    "lo": 10,
    "hi": 15,
    "inc": 2.0,
    "sets": 3,
    "type": "acc",
    "star": false,
    "note": "",
    "group": "背",
    "groups": [
     "背"
    ],
    "rest": "1.5分钟",
    "mode": "load"
   },
   {
    "id": "d2_facepull",
    "name": "面拉 + 蝴蝶机反向飞鸟（超级组）",
    "day": "Day2",
    "w": null,
    "unit": "18kg+中档",
    "lo": 12,
    "hi": 20,
    "inc": 1.0,
    "sets": 5,
    "type": "iso",
    "star": false,
    "note": "面拉2组+反向飞鸟3组",
    "group": "肩后",
    "groups": [
     "肩后"
    ],
    "rest": "1分钟",
    "mode": "untracked"
   },
   {
    "id": "d2_calf",
    "name": "站姿提踵",
    "day": "Day2",
    "w": null,
    "unit": "适中",
    "lo": 12,
    "hi": 20,
    "inc": 5.0,
    "sets": 3,
    "type": "iso",
    "star": false,
    "note": "顶峰停1秒，台下拉伸",
    "group": "小腿",
    "groups": [
     "小腿"
    ],
    "rest": "1分钟",
    "mode": "untracked"
   },
   {
    "id": "d3_hack",
    "name": "哈克深蹲 ★",
    "day": "Day3",
    "w": 100.0,
    "unit": "kg",
    "lo": 6,
    "hi": 12,
    "inc": 5.0,
    "sets": 4,
    "type": "main",
    "star": true,
    "note": "先2组徒手慢蹲激活膝",
    "group": "腿",
    "groups": [
     "腿"
    ],
    "rest": "2.5分钟",
    "mode": "load"
   },
   {
    "id": "d3_hipthrust",
    "name": "臀推",
    "day": "Day3",
    "w": 85.0,
    "unit": "kg",
    "lo": 8,
    "hi": 15,
    "inc": 5.0,
    "sets": 3,
    "type": "acc",
    "star": false,
    "note": "基线85kg，不抢加重",
    "group": "腿",
    "groups": [
     "腿"
    ],
    "rest": "2分钟",
    "mode": "load"
   },
   {
    "id": "d3_legcurl",
    "name": "俯卧腿弯举",
    "day": "Day3",
    "w": 44.5,
    "unit": "kg",
    "lo": 8,
    "hi": 12,
    "inc": 2.0,
    "sets": 3,
    "type": "acc",
    "star": false,
    "note": "",
    "group": "腿",
    "groups": [
     "腿"
    ],
    "rest": "1.5分钟",
    "mode": "load"
   },
   {
    "id": "d3_bulgarian",
    "name": "保加利亚分腿蹲",
    "day": "Day3",
    "w": 42.5,
    "unit": "kg",
    "lo": 10,
    "hi": 12,
    "inc": 2.5,
    "sets": 2,
    "type": "acc",
    "star": false,
    "note": "膝痛换箭步蹲",
    "group": "腿",
    "groups": [
     "腿"
    ],
    "rest": "2分钟",
    "mode": "load"
   },
   {
    "id": "d3_calf_abs",
    "name": "坐姿提踵 + 悬垂举腿（超级组）",
    "day": "Day3",
    "w": null,
    "unit": "适中+自重",
    "lo": 12,
    "hi": 20,
    "inc": 2.0,
    "sets": 7,
    "type": "iso",
    "star": false,
    "note": "提踵4组+举腿3组",
    "group": "小腿",
    "groups": [
     "小腿"
    ],
    "split": {
     "小腿": 4,
     "腹": 3
    },
    "rest": "1分钟",
    "mode": "untracked"
   },
   {
    "id": "d4_smith",
    "name": "上斜史密斯卧推（次场）",
    "day": "Day4",
    "w": 55.0,
    "unit": "kg",
    "lo": 10,
    "hi": 15,
    "inc": 2.5,
    "sets": 3,
    "type": "acc",
    "star": false,
    "note": "次场走容量不走极限，与周一主项同轨迹不同区间",
    "group": "胸",
    "groups": [
     "胸"
    ],
    "rest": "2分钟",
    "mode": "load"
   },
   {
    "id": "d4_fly",
    "name": "上斜绳索夹胸（拉伸位）",
    "day": "Day4",
    "w": null,
    "unit": "轻重量",
    "lo": 12,
    "hi": 20,
    "inc": 1.0,
    "sets": 3,
    "type": "iso",
    "star": false,
    "note": "",
    "group": "胸",
    "groups": [
     "胸"
    ],
    "rest": "1.5分钟",
    "mode": "untracked"
   },
   {
    "id": "d4_lateral",
    "name": "器械/绳索侧平举（单臂）★",
    "day": "Day4",
    "w": 10.0,
    "unit": "kg",
    "lo": 8,
    "hi": 15,
    "inc": 1.0,
    "sets": 4,
    "type": "main",
    "star": true,
    "note": "与周一共享基线，同进退",
    "group": "肩侧",
    "groups": [
     "肩侧"
    ],
    "rest": "1.5分钟",
    "mode": "load",
    "link": "lateral"
   },
   {
    "id": "d4_rearfly",
    "name": "蝴蝶机反向飞鸟",
    "day": "Day4",
    "w": null,
    "unit": "中档",
    "lo": 12,
    "hi": 20,
    "inc": 1.0,
    "sets": 3,
    "type": "iso",
    "star": false,
    "note": "",
    "group": "肩后",
    "groups": [
     "肩后"
    ],
    "rest": "1分钟",
    "mode": "untracked"
   },
   {
    "id": "d4_pushdown",
    "name": "绳索下压",
    "day": "Day4",
    "w": null,
    "unit": "适中",
    "lo": 12,
    "hi": 20,
    "inc": 2.0,
    "sets": 3,
    "type": "iso",
    "star": false,
    "note": "",
    "group": "臂",
    "groups": [
     "臂"
    ],
    "rest": "1分钟",
    "mode": "untracked"
   },
   {
    "id": "d5_pullup",
    "name": "对握引体向上（负重带）★",
    "day": "Day5",
    "w": null,
    "unit": "自重（+负重kg）",
    "lo": 6,
    "hi": 12,
    "inc": 5,
    "sets": 4,
    "type": "main",
    "star": true,
    "note": "底部充分悬垂拉伸；自重全组12次后再负重",
    "group": "背",
    "groups": [
     "背"
    ],
    "rest": "2.5分钟",
    "mode": "bodyweight"
   },
   {
    "id": "d5_pulldown",
    "name": "宽握高位下拉",
    "day": "Day5",
    "w": 52.0,
    "unit": "kg",
    "lo": 10,
    "hi": 15,
    "inc": 2.5,
    "sets": 3,
    "type": "acc",
    "star": false,
    "note": "拉向下胸，沉肩先动",
    "group": "背",
    "groups": [
     "背"
    ],
    "rest": "2分钟",
    "mode": "load"
   },
   {
    "id": "d5_straightarm",
    "name": "直臂下压",
    "day": "Day5",
    "w": 36.0,
    "unit": "kg",
    "lo": 12,
    "hi": 20,
    "inc": 2.0,
    "sets": 2,
    "type": "iso",
    "star": false,
    "note": "屈髋前倾，肘锁死不弯，顶端拉伸1秒",
    "group": "背",
    "groups": [
     "背"
    ],
    "rest": "1.5分钟",
    "mode": "load"
   },
   {
    "id": "d5_lateral_pump",
    "name": "绳索侧平举（泵感）",
    "day": "Day5",
    "w": 9.0,
    "unit": "kg",
    "lo": 15,
    "hi": 25,
    "inc": 1.0,
    "sets": 3,
    "type": "iso",
    "star": false,
    "note": "小肌群不抢加重，15-25宽区间",
    "group": "肩侧",
    "groups": [
     "肩侧"
    ],
    "rest": "1分钟",
    "mode": "load",
    "link": "lateralPump"
   },
   {
    "id": "d5_curl",
    "name": "绳索弯举",
    "day": "Day5",
    "w": 22.5,
    "unit": "kg",
    "lo": 12,
    "hi": 20,
    "inc": 1.0,
    "sets": 3,
    "type": "iso",
    "star": false,
    "note": "肘钉体侧",
    "group": "臂",
    "groups": [
     "臂"
    ],
    "rest": "1分钟",
    "mode": "load"
   }
  ],
  "targets": {
   "volume": {
    "胸": 15,
    "背": 19,
    "肩侧": 12,
    "肩后": 8,
    "腿": 12,
    "臂": 6,
    "腹": 6,
    "小腿": 7
   },
   "steps": 7000,
   "sleep": 7,
   "protein": 150
  },
  "questions": {
   "morning": [
    {
     "id": "weight",
     "title": "今早空腹体重",
     "kind": "number",
     "unit": "kg",
     "on": true,
     "options": []
    },
    {
     "id": "sleep",
     "title": "昨晚睡眠",
     "kind": "options",
     "on": true,
     "options": [
      "不足 6 小时",
      "6 - 7 小时",
      "7 - 8 小时",
      "超过 8 小时"
     ]
    },
    {
     "id": "protein",
     "title": "早餐蛋白质",
     "kind": "options",
     "on": true,
     "options": [
      "够了（约30g+）",
      "一般（约15g）",
      "没吃够（基本碳水）",
      "没吃早饭"
     ]
    },
    {
     "id": "waist",
     "title": "腰围（每周一量）",
     "kind": "number",
     "unit": "cm",
     "on": true,
     "monday_only": true,
     "options": []
    }
   ],
   "evening": [
    {
     "id": "protein_e",
     "title": "晚餐蛋白质",
     "kind": "options",
     "on": true,
     "options": [
      "够了（约40g）",
      "一般（约20g）",
      "没吃够（主要碳水）",
      "外面吃没注意"
     ]
    },
    {
     "id": "creatine",
     "title": "今天肌酸",
     "kind": "options",
     "on": true,
     "options": [
      "吃了 5g",
      "只吃了 3g",
      "忘了"
     ]
    },
    {
     "id": "steps",
     "title": "今天步数",
     "kind": "options",
     "on": true,
     "options": [
      "不足 5000 步",
      "5000 - 7000 步",
      "7000 - 9000 步",
      "超过 9000 步"
     ]
    }
   ],
   "posing": [
    {
     "id": "posing",
     "title": "造型练习",
     "kind": "options",
     "on": true,
     "options": [
      "练了 10-15 分钟",
      "练了 15-30 分钟",
      "练了 30 分钟以上",
      "没练"
     ]
    }
   ]
  }
 },
 "states": {
  "d1_smith": {
   "base": 65,
   "log": [
    {
     "date": "2026-11-02",
     "result": "done",
     "w": 65
    }
   ]
  },
  "d1_seated_press": {
   "base": 52.5,
   "log": [
    {
     "date": "2026-11-02",
     "result": "done",
     "w": 52.5
    }
   ]
  },
  "d1_dip": {
   "base": 0,
   "log": []
  },
  "d1_lateral": {
   "base": 10,
   "log": [
    {
     "date": "2026-10-19",
     "result": "done",
     "w": 10
    },
    {
     "date": "2026-11-02",
     "result": "done",
     "w": 10
    }
   ]
  },
  "d1_abs": {
   "base": null,
   "log": []
  },
  "d2_neutral_row": {
   "base": 60,
   "log": [
    {
     "date": "2026-10-20",
     "result": "done",
     "w": 60
    },
    {
     "date": "2026-10-27",
     "result": "done",
     "w": 60
    },
    {
     "date": "2026-11-03",
     "result": "done",
     "w": 60
    }
   ]
  },
  "d2_cable_seated_row": {
   "base": 59.5,
   "log": [
    {
     "date": "2026-11-03",
     "result": "done",
     "w": 59.5
    }
   ]
  },
  "d2_cable_row": {
   "base": 44.5,
   "log": [
    {
     "date": "2026-10-20",
     "result": "done",
     "w": 44.5
    },
    {
     "date": "2026-10-27",
     "result": "done",
     "w": 44.5
    },
    {
     "date": "2026-11-03",
     "result": "done",
     "w": 44.5
    }
   ]
  },
  "d2_facepull": {
   "base": null,
   "log": []
  },
  "d2_calf": {
   "base": null,
   "log": []
  },
  "d3_hack": {
   "base": 100,
   "log": [
    {
     "date": "2026-10-21",
     "result": "done",
     "w": 100
    },
    {
     "date": "2026-10-28",
     "result": "done",
     "w": 100
    }
   ]
  },
  "d3_hipthrust": {
   "base": 85,
   "log": [
    {
     "date": "2026-10-21",
     "result": "done",
     "w": 85
    },
    {
     "date": "2026-10-28",
     "result": "done",
     "w": 85
    }
   ]
  },
  "d3_legcurl": {
   "base": 44.5,
   "log": [
    {
     "date": "2026-10-21",
     "result": "done",
     "w": 44.5
    },
    {
     "date": "2026-10-28",
     "result": "done",
     "w": 44.5
    }
   ]
  },
  "d3_bulgarian": {
   "base": 42.5,
   "log": [
    {
     "date": "2026-10-21",
     "result": "done",
     "w": 42.5
    },
    {
     "date": "2026-10-28",
     "result": "done",
     "w": 42.5
    }
   ]
  },
  "d3_calf_abs": {
   "base": null,
   "log": []
  },
  "d4_smith": {
   "base": 55,
   "log": []
  },
  "d4_fly": {
   "base": null,
   "log": []
  },
  "d4_lateral": {
   "base": 10,
   "log": [
    {
     "date": "2026-10-22",
     "result": "done",
     "w": 10
    },
    {
     "date": "2026-11-05",
     "result": "done",
     "w": 10
    }
   ]
  },
  "d4_rearfly": {
   "base": null,
   "log": []
  },
  "d4_pushdown": {
   "base": null,
   "log": []
  },
  "d5_pullup": {
   "base": 0,
   "log": []
  },
  "d5_pulldown": {
   "base": 52,
   "log": [
    {
     "date": "2026-10-30",
     "result": "done",
     "w": 52
    },
    {
     "date": "2026-11-06",
     "result": "done",
     "w": 52
    }
   ]
  },
  "d5_straightarm": {
   "base": 36,
   "log": [
    {
     "date": "2026-10-30",
     "result": "done",
     "w": 36
    },
    {
     "date": "2026-11-06",
     "result": "done",
     "w": 36
    }
   ]
  },
  "d5_lateral_pump": {
   "base": 9,
   "log": [
    {
     "date": "2026-10-30",
     "result": "done",
     "w": 9
    },
    {
     "date": "2026-11-06",
     "result": "done",
     "w": 9
    }
   ]
  },
  "d5_curl": {
   "base": 22.5,
   "log": [
    {
     "date": "2026-10-30",
     "result": "miss_weight",
     "w": 22.5
    },
    {
     "date": "2026-11-06",
     "result": "done",
     "w": 22.5
    }
   ]
  }
 },
 "records": [
  {
   "date": "2026-10-16",
   "kind": "morning",
   "data": {
    "weight": 73.5,
    "sleep": 6.5,
    "protein": null,
    "readiness": null
   }
  },
  {
   "date": "2026-10-16",
   "kind": "evening",
   "data": {
    "protein": null,
    "creatine": null,
    "steps": 6000.0
   }
  },
  {
   "date": "2026-10-16",
   "kind": "training",
   "data": {
    "day": "Day5",
    "summary": "Day5背+肩泵 RPE7",
    "items": [],
    "imported": true
   }
  },
  {
   "date": "2026-10-16",
   "kind": "note",
   "data": {
    "text": "引体自重×8×4✓ 宽拉49.5×10×3✓ 直臂下压36×12×2✓ 侧平举9kg×15×3✓ 弯举22.5×12×3✓ ｜ 早/晚餐蛋白均达标，肌酸3g（欠2g明天补回5g），步数5000-7000偏下限"
   }
  },
  {
   "date": "2026-10-17",
   "kind": "morning",
   "data": {
    "weight": 73.5,
    "sleep": 6.5,
    "protein": null,
    "readiness": null
   }
  },
  {
   "date": "2026-10-17",
   "kind": "evening",
   "data": {
    "protein": null,
    "creatine": null,
    "steps": 6000.0
   }
  },
  {
   "date": "2026-10-17",
   "kind": "note",
   "data": {
    "text": "休息日；早餐蛋白够；晚餐蛋白够；肌酸3g（连续两天欠，明天起必须5g）；步数5000-7000"
   }
  },
  {
   "date": "2026-10-18",
   "kind": "morning",
   "data": {
    "weight": 73.5,
    "sleep": 6.5,
    "protein": null,
    "readiness": null
   }
  },
  {
   "date": "2026-10-18",
   "kind": "note",
   "data": {
    "text": "休息日；早餐蛋白够；造型练习待补（已提醒现在去）"
   }
  },
  {
   "date": "2026-10-19",
   "kind": "morning",
   "data": {
    "weight": 73.6,
    "sleep": 6.5,
    "protein": null,
    "readiness": null
   }
  },
  {
   "date": "2026-10-19",
   "kind": "evening",
   "data": {
    "protein": null,
    "creatine": null,
    "steps": 8000
   }
  },
  {
   "date": "2026-10-19",
   "kind": "training",
   "data": {
    "day": "Day1",
    "summary": "Day1胸 RPE7✓",
    "items": [],
    "imported": true
   }
  },
  {
   "date": "2026-10-20",
   "kind": "morning",
   "data": {
    "weight": 73.3,
    "sleep": 7.5,
    "protein": null,
    "readiness": null
   }
  },
  {
   "date": "2026-10-20",
   "kind": "evening",
   "data": {
    "protein": null,
    "creatine": null,
    "steps": 8000
   }
  },
  {
   "date": "2026-10-20",
   "kind": "training",
   "data": {
    "day": "Day2",
    "summary": "Day2背 RPE7✓",
    "items": [],
    "imported": true
   }
  },
  {
   "date": "2026-10-20",
   "kind": "note",
   "data": {
    "text": "海豹划船60kg定为基线"
   }
  },
  {
   "date": "2026-10-21",
   "kind": "morning",
   "data": {
    "weight": 73.5,
    "sleep": 7.5,
    "protein": null,
    "readiness": null
   }
  },
  {
   "date": "2026-10-21",
   "kind": "training",
   "data": {
    "day": "Day3",
    "summary": "Day3腿 RPE7✓",
    "items": [],
    "imported": true
   }
  },
  {
   "date": "2026-10-21",
   "kind": "posing",
   "data": {
    "minutes": 10
   }
  },
  {
   "date": "2026-10-21",
   "kind": "note",
   "data": {
    "text": "臀推80/腿弯举36定基线"
   }
  },
  {
   "date": "2026-10-22",
   "kind": "morning",
   "data": {
    "weight": 73.9,
    "sleep": 7.5,
    "protein": null,
    "readiness": null
   }
  },
  {
   "date": "2026-10-22",
   "kind": "training",
   "data": {
    "day": "Day4",
    "summary": "Day4胸次 RPE7✓",
    "items": [],
    "imported": true
   }
  },
  {
   "date": "2026-10-23",
   "kind": "note",
   "data": {
    "text": "【缺记录】Day5未打卡，10-30补练"
   }
  },
  {
   "date": "2026-10-24",
   "kind": "note",
   "data": {
    "text": "周末未打卡"
   }
  },
  {
   "date": "2026-10-25",
   "kind": "morning",
   "data": {
    "weight": 73.5,
    "sleep": 7.5,
    "protein": null,
    "readiness": null
   }
  },
  {
   "date": "2026-10-25",
   "kind": "posing",
   "data": {
    "minutes": 10
   }
  },
  {
   "date": "2026-10-26",
   "kind": "morning",
   "data": {
    "weight": 73.6,
    "sleep": 7.5,
    "protein": null,
    "readiness": null
   }
  },
  {
   "date": "2026-10-26",
   "kind": "note",
   "data": {
    "text": "周日未打卡"
   }
  },
  {
   "date": "2026-10-27",
   "kind": "morning",
   "data": {
    "weight": 73.2,
    "sleep": 7.5,
    "protein": null,
    "readiness": null
   }
  },
  {
   "date": "2026-10-27",
   "kind": "training",
   "data": {
    "day": "Day2",
    "summary": "Day2背 RPE7.5-8✓",
    "items": [],
    "imported": true
   }
  },
  {
   "date": "2026-10-27",
   "kind": "note",
   "data": {
    "text": "海豹70kg（+10kg幅度偏大，已换绳索划船）"
   }
  },
  {
   "date": "2026-10-28",
   "kind": "morning",
   "data": {
    "weight": 73.8,
    "sleep": 7.5,
    "protein": null,
    "readiness": null
   }
  },
  {
   "date": "2026-10-28",
   "kind": "training",
   "data": {
    "day": "Day3",
    "summary": "Day3腿 RPE7.5-8✓",
    "items": [],
    "imported": true
   }
  },
  {
   "date": "2026-10-28",
   "kind": "posing",
   "data": {
    "minutes": 10
   }
  },
  {
   "date": "2026-10-28",
   "kind": "note",
   "data": {
    "text": "臀推90/腿弯举42.5（轻松+1档）"
   }
  },
  {
   "date": "2026-10-29",
   "kind": "morning",
   "data": {
    "weight": 73.7,
    "sleep": 7.5,
    "protein": null,
    "readiness": null
   }
  },
  {
   "date": "2026-10-29",
   "kind": "note",
   "data": {
    "text": "【缺记录】Day4未打卡，11-05补练"
   }
  },
  {
   "date": "2026-10-30",
   "kind": "morning",
   "data": {
    "weight": 74.0,
    "sleep": 7.5,
    "protein": null,
    "readiness": null
   }
  },
  {
   "date": "2026-10-30",
   "kind": "training",
   "data": {
    "day": "Day5",
    "summary": "Day5背 RPE7✓",
    "items": [],
    "imported": true
   }
  },
  {
   "date": "2026-10-30",
   "kind": "note",
   "data": {
    "text": "弯举没完成-太重；肌酸5g"
   }
  },
  {
   "date": "2026-10-31",
   "kind": "note",
   "data": {
    "text": "周六未打卡"
   }
  },
  {
   "date": "2026-11-01",
   "kind": "note",
   "data": {
    "text": "周日未打卡"
   }
  },
  {
   "date": "2026-11-02",
   "kind": "morning",
   "data": {
    "weight": 74.2,
    "sleep": 7.5,
    "protein": null,
    "readiness": null
   }
  },
  {
   "date": "2026-11-02",
   "kind": "evening",
   "data": {
    "protein": null,
    "creatine": null,
    "steps": 8000
   }
  },
  {
   "date": "2026-11-02",
   "kind": "training",
   "data": {
    "day": "Day1",
    "summary": "Day1胸(新版) RPE7✓",
    "items": [],
    "imported": true
   }
  },
  {
   "date": "2026-11-02",
   "kind": "note",
   "data": {
    "text": "史密斯60/坐姿平推50首练；肌酸忘了"
   }
  },
  {
   "date": "2026-11-03",
   "kind": "morning",
   "data": {
    "weight": 73.8,
    "sleep": 7.5,
    "protein": null,
    "readiness": null
   }
  },
  {
   "date": "2026-11-03",
   "kind": "evening",
   "data": {
    "protein": null,
    "creatine": null,
    "steps": 9500
   }
  },
  {
   "date": "2026-11-03",
   "kind": "training",
   "data": {
    "day": "Day2",
    "summary": "Day2背 RPE8.5-9✓",
    "items": [],
    "imported": true
   }
  },
  {
   "date": "2026-11-03",
   "kind": "note",
   "data": {
    "text": "划船57.5(W3)；绳索划船57定基线；早餐蛋白一般"
   }
  },
  {
   "date": "2026-11-04",
   "kind": "note",
   "data": {
    "text": "Day3未打卡"
   }
  },
  {
   "date": "2026-11-05",
   "kind": "morning",
   "data": {
    "weight": 74.3,
    "sleep": 7.5,
    "protein": null,
    "readiness": null
   }
  },
  {
   "date": "2026-11-05",
   "kind": "evening",
   "data": {
    "protein": null,
    "creatine": null,
    "steps": 8000
   }
  },
  {
   "date": "2026-11-05",
   "kind": "training",
   "data": {
    "day": "Day4",
    "summary": "Day4胸次 RPE7.5-8✓",
    "items": [],
    "imported": true
   }
  },
  {
   "date": "2026-11-06",
   "kind": "morning",
   "data": {
    "weight": 74.0,
    "sleep": 7.5,
    "protein": null,
    "readiness": null
   }
  },
  {
   "date": "2026-11-06",
   "kind": "evening",
   "data": {
    "protein": null,
    "creatine": null,
    "steps": 8000
   }
  },
  {
   "date": "2026-11-06",
   "kind": "training",
   "data": {
    "day": "Day5",
    "summary": "Day5背 RPE7.5-8✓",
    "items": [],
    "imported": true
   }
  },
  {
   "date": "2026-11-07",
   "kind": "note",
   "data": {
    "text": "周六未打卡"
   }
  },
  {
   "date": "2026-11-08",
   "kind": "note",
   "data": {
    "text": "周日未打卡"
   }
  },
  {
   "date": "2026-11-09",
   "kind": "morning",
   "data": {
    "weight": 73.8,
    "sleep": 7.5,
    "protein": null,
    "readiness": null
   }
  },
  {
   "date": "2026-11-09",
   "kind": "training",
   "data": {
    "day": null,
    "summary": "待练",
    "items": [],
    "imported": true
   }
  },
  {
   "date": "2026-11-09",
   "kind": "note",
   "data": {
    "text": "Day1史密斯W2 60kg RPE7.5-8"
   }
  }
 ],
 "meta": {
  "generated": "2026-11-17",
  "source": "手册v17 + 引擎v7 + 双进阶校准"
 }
};
if (typeof module !== 'undefined' && module.exports) module.exports = __G.SEED;
