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
