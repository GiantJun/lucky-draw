/**
 * chrome v8 实现
 */
/*
// ECMA 262 - 15.8.2.14
	var rngstate;  // Initialized to a Uint32Array during genesis.
	function MathRandom() {
		var r0 = (MathImul(18030, rngstate[0] & 0xFFFF) + (rngstate[0] >>> 16)) | 0;
		rngstate[0] = r0;
		var r1 = (MathImul(36969, rngstate[1] & 0xFFFF) + (rngstate[1] >>> 16)) | 0;
		rngstate[1] = r1;
		var x = ((r0 << 16) + (r1 & 0xFFFF)) | 0;
		// Division by 0x100000000 through multiplication by reciprocal.
		return (x < 0 ? (x + 0x100000000) : x) * 2.3283064365386962890625e-10;
	}
*/

export function generateArray(start, end) {
  return Array.from(new Array(end + 1).keys()).slice(start);
}

/**
 * 取范围内随机整数
 * @param {number} minNum
 * @param {number} maxNum
 */
export function randomNum(minNum = 1, maxNum) {
  return parseInt(Math.random() * (maxNum - minNum + 1) + minNum, 10);
}

/**
 * 检查人员是否已中奖
 * @param {string} displayName 显示名称
 * @param {string} realName 真实姓名
 * @param {object} results 抽奖结果
 * @param {boolean} winnerExcludesAll 一人中奖全部失效开关
 * @param {string} currentPrizeLevel 当前奖品等级
 * @param {string} currentPrizeName 当前奖品名称
 * @returns {boolean}
 */
export function hasWon(displayName, realName, results, winnerExcludesAll, currentPrizeLevel, currentPrizeName) {
  if (winnerExcludesAll) {
    // 开关开：基于真实姓名判断所有奖品，一人中奖则全部候选名失效
    for (const level in results) {
      for (const prizeName in results[level]) {
        const winners = results[level][prizeName] || [];
        if (winners.some(w => w.realName === realName)) {
          return true; // 该人已中奖，排除
        }
      }
    }
  } else {
    // 开关关：分情况判断
    for (const level in results) {
      for (const prizeName in results[level]) {
        const winners = results[level][prizeName] || [];

        // 判断是否是当前正在抽的奖品
        if (level === currentPrizeLevel && prizeName === currentPrizeName) {
          // 当前奖品：基于真实姓名判断（防止张三1和张三2都中同一个奖品）
          if (winners.some(w => w.realName === realName)) {
            return true; // 该人已中此奖品，排除
          }
        } else {
          // 其他奖品：基于显示名称判断（允许张三1中奖品A，张三2中奖品B）
          if (winners.some(w => w.displayName === displayName)) {
            return true; // 该显示名称已中其他奖品，排除
          }
        }
      }
    }
  }
  return false; // 未中奖，可以参与
}

/**
 * 检查人员类型是否符合奖品要求
 * @param {string} personType 人员类型（正职/外包）
 * @param {string} eligibility 奖品要求（正职/外包/全部）
 * @returns {boolean}
 */
export function isEligible(personType, eligibility) {
  if (eligibility === '全部') {
    return true;
  }
  return personType === eligibility;
}

/**
 * 生成候选人名单
 * @param {string} prizeLevel 奖品等级
 * @param {string} prizeName 奖品名称
 * @param {object} prize 奖品对象
 * @param {array} participants 参与人员列表
 * @param {object} results 抽奖结果
 * @param {object} config 配置
 * @returns {array} 候选人列表
 */
export function generateCandidates(prizeLevel, prizeName, prize, participants, results, config) {
  const { enableExtraTimes, extraTimesLevels = [], winnerExcludesAll } = config;
  const candidates = [];

  // 判断当前奖品等级是否应用额外抽奖次数
  const shouldApplyExtraTimes = enableExtraTimes && extraTimesLevels.includes(prizeLevel);

  participants.forEach(person => {
    // 1. 检查该人员工类型是否符合该奖品要求
    if (!isEligible(person.type, prize.eligibility)) {
      return; // 不符合，跳过
    }

    // 2. 根据配置决定是否应用额外抽奖次数
    if (shouldApplyExtraTimes && person.extraTimes > 0) {
      // 生成多个候选名: 张三1, 张三2
      for (let i = 1; i <= person.extraTimes; i++) {
        const displayName = `${person.name}${i}`;

        // 检查是否已中奖（传入当前奖品信息）
        if (hasWon(displayName, person.name, results, winnerExcludesAll, prizeLevel, prizeName)) {
          continue; // 已中奖，跳过
        }

        candidates.push({
          displayName: displayName,
          realName: person.name,
          type: person.type
        });
      }
    } else {
      // 不应用额外抽奖次数：只生成一个候选名(不带数字后缀)
      const displayName = person.name;

      // 检查是否已中奖
      if (hasWon(displayName, person.name, results, winnerExcludesAll, prizeLevel, prizeName)) {
        return; // 已中奖，跳过
      }

      candidates.push({
        displayName: person.name,
        realName: person.name,
        type: person.type
      });
    }
  });

  return candidates;
}

/**
 * 从候选人中随机抽取
 * @param {array} candidates 候选人列表
 * @param {number} num 抽取人数
 * @returns {array} 中奖者列表
 */
export function randomSelectWinners(candidates, num) {
  const winners = [];
  const selectedIndices = new Set();

  if (candidates.length < num) {
    throw new Error('候选人数量不足');
  }

  while (winners.length < num) {
    const index = randomNum(0, candidates.length - 1);
    if (!selectedIndices.has(index)) {
      selectedIndices.add(index);
      winners.push(candidates[index]);
    }
  }

  return winners;
}

/**
 * 单次抽奖（保留旧版兼容）
 * @param {number} total 总人数
 * @param {array} won 已中奖
 * @param {number} num 本次抽取人数
 */
export function luckydrawHandler(total, won = [], num) {
  const peolist = generateArray(1, Number(total));
  const wons = won;
  const res = [];
  for (let j = 0; j < num; j++) {
    const nodraws = peolist.filter(item => !wons.includes(item));
    const current = nodraws[randomNum(1, nodraws.length) - 1];
    res.push(current);
    wons.push(current);
  }
  return res;
}
