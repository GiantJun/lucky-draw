export function setData(key, value) {
  if (typeof value === 'string') {
    return localStorage.setItem(key, value);
  }
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (err) {
    return err;
  }
}

export function getData(key) {
  const value = localStorage.getItem(key);
  try {
    return JSON.parse(value);
  } catch (err) {
    return value;
  }
}

export function removeData(key) {
  return localStorage.removeItem(key);
}

export function clearData() {
  return localStorage.clear();
}

export function getDomData(element, dataName) {
  if (!element || !dataName || !element.getAttribute) {
    return;
  }
  return element.getAttribute('data-' + dataName);
}

export const configField = 'config'; // 配置数据
export const resultField = 'result'; // 抽奖结果
export const participantsField = 'participants'; // 参与人员名单
export const prizesField = 'prizes'; // 奖品配置
export const newLotteryField = 'newLottery'; // 新增奖项（保留兼容）
export const listField = 'list'; // 名单（保留兼容）

// 默认人员名单配置（20个正职人员，额外抽奖次数都是3）
export const defaultParticipants = [
  { name: '张三', type: '正职', extraTimes: 3 },
  { name: '李四', type: '正职', extraTimes: 3 },
  { name: '王五', type: '正职', extraTimes: 3 },
  { name: '赵六', type: '正职', extraTimes: 3 },
  { name: '孙七', type: '正职', extraTimes: 3 },
  { name: '周八', type: '正职', extraTimes: 3 },
  { name: '吴九', type: '正职', extraTimes: 3 },
  { name: '郑十', type: '正职', extraTimes: 3 },
  { name: '钱一', type: '正职', extraTimes: 3 },
  { name: '陈二', type: '正职', extraTimes: 3 },
  { name: '刘三', type: '正职', extraTimes: 3 },
  { name: '杨四', type: '正职', extraTimes: 3 },
  { name: '黄五', type: '正职', extraTimes: 3 },
  { name: '朱六', type: '正职', extraTimes: 3 },
  { name: '林七', type: '正职', extraTimes: 3 },
  { name: '何八', type: '正职', extraTimes: 3 },
  { name: '徐九', type: '正职', extraTimes: 3 },
  { name: '马十', type: '正职', extraTimes: 3 },
  { name: '梁一', type: '正职', extraTimes: 3 },
  { name: '宋二', type: '正职', extraTimes: 3 }
];

// 默认奖品配置
export const defaultPrizes = {
  '特等奖': [
    { name: 'iPad Air', quantity: 1, eligibility: '正职' }
  ],
  '一等奖': [
    { name: 'vivo X300(12+512)', quantity: 1, eligibility: '正职' },
    { name: 'oppo fine x8', quantity: 1, eligibility: '正职' },
    { name: '荣耀400', quantity: 1, eligibility: '正职' },
    { name: '华为nova flip', quantity: 1, eligibility: '正职' },
    { name: '大疆action5(畅拍套装)', quantity: 1, eligibility: '正职' },
    { name: '影视360 ACE pro2 玩拍套装', quantity: 1, eligibility: '正职' }
  ],
  '二等奖': [
    { name: '哈曼卡顿琉璃玻璃5', quantity: 1, eligibility: '正职' },
    { name: '富士wide400(带相纸)', quantity: 1, eligibility: '正职' },
    { name: '石头内衣洗烘一体机', quantity: 1, eligibility: '正职' },
    { name: 'xiaomi pad 8 pro', quantity: 1, eligibility: '正职' },
    { name: '马歇尔STANMORE III音箱', quantity: 1, eligibility: '正职' }
  ],
  '三等奖': [
    { name: '美的空气炸锅', quantity: 5, eligibility: '全部' },
    { name: '徕芬吹风机SE2', quantity: 5, eligibility: '全部' },
    { name: '亚朵星球深睡枕PRO', quantity: 5, eligibility: '全部' },
    { name: '乐高法拉利跑车', quantity: 5, eligibility: '全部' }
  ]
};

/**
 * 解析人员CSV内容
 * @param {string} csvContent CSV文件内容
 * @returns {array} 解析后的人员数组
 */
export function parseParticipantsCSV(csvContent) {
  const lines = csvContent.trim().split('\n');
  const participants = [];

  // 跳过标题行
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    const parts = line.split(',');
    if (parts.length >= 2) {
      participants.push({
        name: parts[0].trim(),
        type: parts[1].trim(),
        extraTimes: parts[2] ? parseInt(parts[2].trim()) : 0
      });
    }
  }

  return participants;
}

/**
 * 解析奖品CSV内容
 * @param {string} csvContent CSV文件内容
 * @returns {object} 解析后的奖品对象
 */
export function parsePrizesCSV(csvContent) {
  const lines = csvContent.trim().split('\n');
  const prizes = {};

  // 跳过标题行
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    const parts = line.split(',');
    if (parts.length >= 4) {
      const level = parts[0].trim();
      const name = parts[1].trim();
      const quantity = parseInt(parts[2].trim());
      const eligibility = parts[3].trim();

      if (!prizes[level]) {
        prizes[level] = [];
      }

      prizes[level].push({
        name,
        quantity,
        eligibility
      });
    }
  }

  return prizes;
}

export function conversionCategoryName(key) {
  let name = '';
  switch (key) {
    case 'firstPrize':
      name = '一等奖';
      break;
    default:
      break;
  }
  const newLottery = getData(newLotteryField) || [];
  const findres = newLottery.find(item => item.key === key);
  if (findres) {
    name = findres.name;
  }
  return name;
}
