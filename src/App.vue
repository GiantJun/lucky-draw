<template>
  <div id="root">
    <header>
      <Publicity v-show="!running" />
      <el-button class="res" type="text" @click="showResult = true">
        抽奖结果
      </el-button>
      <el-button class="con" type="text" @click="showConfig = true">
        抽奖配置
      </el-button>
    </header>
    <div id="main" :class="{ mask: showRes }"></div>
    <div id="tags">
      <ul v-for="item in datas" :key="item.key">
        <li>
          <a
            href="javascript:void(0);"
            :style="{
              color: '#ffd700',
            }"
          >
            {{ item.displayName }}
            <img v-if="item.photo" :src="item.photo" :width="50" :height="50" />
          </a>
        </li>
      </ul>
    </div>
    <transition name="bounce">
      <div id="resbox" v-show="showRes">
        <p @click="showRes = false">{{ prizeDisplayName }}抽奖结果：</p>
        <div class="container">
          <span
            v-for="(item, index) in resArr"
            :key="index"
            class="itemres"
            :style="resCardStyle"
            @click="showRes = false"
            :class="{
              numberOver: !!item.photo,
            }"
          >
            <span class="cont" v-if="!item.photo">
              <span
                :style="{
                  fontSize: item.prizeName ? '30px' : '40px',
                }"
              >
                {{ item.realName }}
                <span v-if="item.prizeName" :style="{ display: 'block', fontSize: '20px', color: '#ff6b6b', marginTop: '10px' }">
                  {{ item.prizeName }}
                </span>
              </span>
            </span>
            <span v-if="item.photo" class="photo-wrapper">
              <img
                :src="item.photo"
                alt="photo"
                :width="160"
                :height="160"
              />
              <span v-if="item.prizeName" class="prize-label">{{ item.prizeName }}</span>
            </span>
          </span>
        </div>
      </div>
    </transition>

    <el-button
      class="audio"
      type="text"
      @click="
        () => {
          playAudio(!audioPlaying);
        }
      "
    >
      <i
        class="iconfont"
        :class="[audioPlaying ? 'iconstop' : 'iconplay1']"
      ></i>
    </el-button>

    <LotteryConfig :visible.sync="showConfig" @resetconfig="reloadTagCanvas" />
    <Tool
      @toggle="toggle"
      @resetConfig="reloadTagCanvas"
      :running="running"
      :closeRes="closeRes"
    />
    <Result :visible.sync="showResult"></Result>

    <span class="copy-right">
      Copyright©GiantJun
    </span>

    <audio
      id="audiobg"
      preload="auto"
      controls
      autoplay
      loop
      @play="playHandler"
      @pause="pauseHandler"
    >
      <source :src="audioSrc" />
      你的浏览器不支持audio标签
    </audio>
  </div>
</template>
<script>
import LotteryConfig from '@/components/LotteryConfig';
import Publicity from '@/components/Publicity';
import Tool from '@/components/Tool';
import bgaudio from '@/assets/bg.mp3';
import beginaudio from '@/assets/begin.mp3';
import {
  getData,
  setData,
  configField,
  resultField,
  participantsField,
  prizesField,
  defaultParticipants,
  defaultPrizes
} from '@/helper/index';
import { generateCandidates, randomSelectWinners } from '@/helper/algorithm';
import Result from '@/components/Result';

export default {
  name: 'App',

  components: { LotteryConfig, Publicity, Tool, Result },

  computed: {
    resCardStyle() {
      const style = { fontSize: '30px' };
      const participantsCount = this.participants.length;
      if (participantsCount < 100) {
        style.fontSize = '100px';
      } else if (participantsCount < 1000) {
        style.fontSize = '80px';
      } else if (participantsCount < 10000) {
        style.fontSize = '60px';
      }
      return style;
    },
    config: {
      get() {
        return this.$store.state.config;
      },
    },
    result: {
      get() {
        return this.$store.state.result;
      },
      set(val) {
        this.$store.commit('setResult', val);
      },
    },
    participants() {
      return this.$store.state.participants;
    },
    prizes() {
      return this.$store.state.prizes;
    },
    photos() {
      return this.$store.state.photos;
    },
    datas() {
      // 如果正在抽奖且有当前候选人，显示当前候选人
      if (this.currentCandidates.length > 0) {
        return this.currentCandidates.map((candidate, index) => {
          const photo = this.photos.find((d) => d.name === candidate.realName);
          return {
            key: `${candidate.displayName}_${index}`,
            displayName: candidate.displayName,
            photo: photo ? photo.value : '',
          };
        });
      }

      // 否则显示所有参与人员的样本（用于初始展示）
      const sampleSize = this.participants.length >= 1500 ? 500 : this.participants.length;
      const displayParticipants = [];

      for (let i = 0; i < Math.min(sampleSize, this.participants.length); i++) {
        const person = this.participants[i];
        const photo = this.photos.find((d) => d.name === person.name);

        // 根据配置决定显示方式
        if (this.config.enableExtraTimes && person.extraTimes > 0) {
          // 显示所有候选名
          for (let j = 1; j <= person.extraTimes; j++) {
            displayParticipants.push({
              key: `${person.name}_${j}`,
              displayName: `${person.name}${j}`,
              photo: photo ? photo.value : '',
            });
          }
        } else {
          displayParticipants.push({
            key: person.name,
            displayName: person.name,
            photo: photo ? photo.value : '',
          });
        }
      }

      return displayParticipants;
    },
    prizeDisplayName() {
      if (!this.currentPrizeLevel) return '';
      if (!this.currentPrizeName) return this.currentPrizeLevel;
      return `${this.currentPrizeLevel} - ${this.currentPrizeName}`;
    },
  },

  created() {
    const data = getData(configField);
    if (data) {
      this.$store.commit('setConfig', Object.assign({}, data));
    }

    const result = getData(resultField);
    if (result) {
      this.$store.commit('setResult', result);
    }

    const participants = getData(participantsField);
    if (participants) {
      this.$store.commit('setParticipants', participants);
    } else {
      // 如果没有人员名单，使用默认配置
      this.$store.commit('setParticipants', defaultParticipants);
      setData(participantsField, defaultParticipants);
    }

    const prizes = getData(prizesField);
    if (prizes) {
      this.$store.commit('setPrizes', prizes);
    } else {
      // 如果没有奖品配置，使用默认配置
      this.$store.commit('setPrizes', defaultPrizes);
      setData(prizesField, defaultPrizes);
    }
  },

  data() {
    return {
      running: false,
      showRes: false,
      showConfig: false,
      showResult: false,
      resArr: [],
      currentCandidates: [],
      currentPrizeLevel: '',
      currentPrizeName: '',
      currentPrize: null,
      audioPlaying: false,
      audioSrc: bgaudio,
      resizeTimer: null
    };
  },

  watch: {
    photos: {
      deep: true,
      handler() {
        this.$nextTick(() => {
          this.reloadTagCanvas();
        });
      },
    },
  },

  mounted() {
    this.startTagCanvas();
    window.addEventListener('resize', this.reportWindowSize);
  },

  beforeDestroy() {
    window.removeEventListener('resize', this.reportWindowSize);
    if (this.resizeTimer) {
      clearTimeout(this.resizeTimer);
    }
  },

  methods: {
    reportWindowSize() {
      // 防抖处理，避免频繁resize时重复创建
      if (this.resizeTimer) {
        clearTimeout(this.resizeTimer);
      }
      this.resizeTimer = setTimeout(() => {
        const stageContainer = this.$el.querySelector('#lottery-stage');
        if (stageContainer && stageContainer.parentElement) {
          stageContainer.parentElement.removeChild(stageContainer);
        }
        this.startTagCanvas();
      }, 300);
    },
    playHandler() {
      this.audioPlaying = true;
    },
    pauseHandler() {
      this.audioPlaying = false;
    },
    playAudio(type) {
      if (type) {
        this.$el.querySelector('#audiobg').play();
      } else {
        this.$el.querySelector('#audiobg').pause();
      }
    },
    loadAudio() {
      this.$el.querySelector('#audiobg').load();
      this.$nextTick(() => {
        this.$el.querySelector('#audiobg').play();
      });
    },
    speed() {
      return [0.1 * Math.random() + 0.01, -(0.1 * Math.random() + 0.01)];
    },
    createCanvas() {
      const mainContainer = this.$el.querySelector('#main');

      // 创建磨砂玻璃容器
      const stageContainer = document.createElement('div');
      stageContainer.className = 'lottery-stage';
      stageContainer.id = 'lottery-stage';

      // 创建canvas - 根据视窗大小动态计算尺寸
      const canvas = document.createElement('canvas');

      // 计算Canvas尺寸：取视窗宽高的较小值作为基准，留出边距
      const viewportWidth = window.innerWidth;
      const viewportHeight = window.innerHeight;

      // 响应式预留空间
      let headerHeight = 80;
      let sideMargin = 180; // 左右边距 + 右侧按钮区域
      let bottomMargin = 40;

      // 小屏幕适配
      if (viewportWidth <= 768) {
        headerHeight = 60;
        sideMargin = 120;
        bottomMargin = 30;
      }
      if (viewportWidth <= 480) {
        sideMargin = 80;
        bottomMargin = 20;
      }

      const availableWidth = viewportWidth - sideMargin;
      const availableHeight = viewportHeight - headerHeight - bottomMargin;

      // 保持16:10的宽高比，优先使用可用宽度的80-90%
      let canvasWidth = availableWidth * 0.85;
      let canvasHeight = canvasWidth * 0.6;

      // 如果高度超出可用高度，则以高度为准重新计算
      if (canvasHeight > availableHeight * 0.85) {
        canvasHeight = availableHeight * 0.85;
        canvasWidth = canvasHeight / 0.6;
      }

      // 设置响应式最小和最大尺寸
      const minWidth = viewportWidth <= 480 ? 300 : (viewportWidth <= 768 ? 400 : 500);
      const minHeight = minWidth * 0.6;
      const maxWidth = viewportWidth <= 768 ? availableWidth * 0.95 : availableWidth * 0.9;
      const maxHeight = maxWidth * 0.6;

      canvasWidth = Math.max(minWidth, Math.min(canvasWidth, maxWidth));
      canvasHeight = Math.max(minHeight, Math.min(canvasHeight, maxHeight));

      canvas.width = canvasWidth;
      canvas.height = canvasHeight;
      canvas.id = 'rootcanvas';

      stageContainer.appendChild(canvas);
      mainContainer.appendChild(stageContainer);
    },
    startTagCanvas() {
      this.createCanvas();
      const { speed } = this;
      window.TagCanvas.Start('rootcanvas', 'tags', {
        textColour: '#ffd700',  // 虎牙黄
        outlineColour: '#fff',
        outlineThickness: 2,
        initial: speed(),
        dragControl: 1,
        textHeight: 20,
        noSelect: true,
        lock: 'xy',
        depth: 0.8,
        maxSpeed: 0.05,
        minSpeed: 0.01,
        decel: 0.98,
        weight: true,
        weightMode: 'both',
        shadowBlur: 3,
        shadowOffset: [0, 0]
      });
    },
    reloadTagCanvas() {
      window.TagCanvas.Reload('rootcanvas');
    },
    closeRes() {
      this.showRes = false;
    },
    toggle(form) {
      const { speed } = this;
      const stageContainer = this.$el.querySelector('#lottery-stage');

      if (this.running) {
        // 停止抽奖
        this.audioSrc = bgaudio;
        this.loadAudio();

        // 移除active类，恢复正常呼吸灯
        if (stageContainer) {
          stageContainer.classList.remove('active');
        }

        window.TagCanvas.SetSpeed('rootcanvas', speed());
        this.showRes = true;
        this.running = !this.running;

        // 清空当前候选人
        this.currentCandidates = [];

        this.$nextTick(() => {
          this.reloadTagCanvas();
        });
      } else {
        // 开始抽奖
        this.showRes = false;
        if (!form) {
          return;
        }

        this.audioSrc = beginaudio;
        this.loadAudio();

        // 添加active类，加快呼吸灯
        if (stageContainer) {
          stageContainer.classList.add('active');
        }

        const { prizeLevel, prizeName, prize, num, isLevelDraw, prizes } = form;

        // 保存当前抽奖信息
        this.currentPrizeLevel = prizeLevel;
        this.currentPrizeName = prizeName;
        this.currentPrize = prize;

        try {
          // 如果是整个等级的抽奖（特一二等奖）
          if (isLevelDraw && prizes) {
            // 合并该等级所有奖品的候选人
            const allCandidatesMap = new Map();
            prizes.forEach(p => {
              try {
                const candidates = generateCandidates(
                  prizeLevel,
                  p.name,
                  p,
                  this.participants,
                  this.result,
                  this.config
                );
                candidates.forEach(candidate => {
                  // 使用 displayName 作为唯一键，避免重复
                  if (!allCandidatesMap.has(candidate.displayName)) {
                    allCandidatesMap.set(candidate.displayName, candidate);
                  }
                });
              } catch (error) {
                console.error(`生成奖品 ${p.name} 候选人失败:`, error);
              }
            });

            const allCandidates = Array.from(allCandidatesMap.values());

            // 计算去重后的实际候选人数（按真实姓名）
            const uniqueRealNames = new Set(allCandidates.map(c => c.realName));
            if (uniqueRealNames.size < num) {
              this.$message.error(`符合条件的不同候选人只有 ${uniqueRealNames.size} 人，少于需要抽取的 ${num} 个奖品数量`);
              return;
            }

            // 保存候选人用于显示
            this.currentCandidates = allCandidates;

            // 随机抽取中奖者，确保同一个人（realName）不会中多次
            const winners = [];
            const selectedRealNames = new Set();
            const selectedIndices = new Set();
            const { randomNum } = require('@/helper/algorithm');

            while (winners.length < num) {
              const index = randomNum(0, allCandidates.length - 1);

              if (selectedIndices.has(index)) {
                continue;
              }

              const candidate = allCandidates[index];

              // 检查是否已经有相同的 realName
              if (!selectedRealNames.has(candidate.realName)) {
                selectedIndices.add(index);
                selectedRealNames.add(candidate.realName);
                winners.push(candidate);
              }
            }

            // 按顺序分配奖品
            let winnerIndex = 0;
            const prizeWinnersMap = {}; // 记录每个奖品的中奖者

            for (const p of prizes) {
              // 计算该奖品还剩多少数量
              const levelResults = this.result[prizeLevel];
              let prizeRemain = p.quantity;
              if (levelResults && levelResults[p.name]) {
                prizeRemain = p.quantity - levelResults[p.name].length;
              }

              // 分配中奖者给该奖品
              const prizeWinners = [];
              for (let i = 0; i < prizeRemain && winnerIndex < winners.length; i++) {
                prizeWinners.push(winners[winnerIndex]);
                winnerIndex++;
              }

              if (prizeWinners.length > 0) {
                prizeWinnersMap[p.name] = prizeWinners;
              }
            }

            // 添加照片信息并标记奖品名称
            this.resArr = winners.map((winner) => {
              const photo = this.photos.find((d) => d.name === winner.realName);

              // 找到该中奖者对应的奖品
              let assignedPrizeName = '';
              for (const [pName, pWinners] of Object.entries(prizeWinnersMap)) {
                if (pWinners.some(w => w.displayName === winner.displayName)) {
                  assignedPrizeName = pName;
                  break;
                }
              }

              return {
                ...winner,
                photo: photo ? photo.value : null,
                prizeName: assignedPrizeName // 添加奖品名称
              };
            });

            // 保存结果到store
            if (!this.result[prizeLevel]) {
              this.$set(this.result, prizeLevel, {});
            }

            const newResult = Object.assign({}, this.result);

            // 将中奖者按奖品分类保存
            for (const [pName, pWinners] of Object.entries(prizeWinnersMap)) {
              if (!newResult[prizeLevel][pName]) {
                this.$set(newResult[prizeLevel], pName, []);
              }
              const oldRes = newResult[prizeLevel][pName] || [];
              newResult[prizeLevel][pName] = oldRes.concat(pWinners);
            }

            this.result = newResult;

            window.TagCanvas.SetSpeed('rootcanvas', [5, 1]);
            this.running = !this.running;

            this.$nextTick(() => {
              this.reloadTagCanvas();
            });
            return;
          }

          // 原有的单个奖品抽奖逻辑
          // 生成候选人名单
          const candidates = generateCandidates(
            prizeLevel,
            prizeName,
            prize,
            this.participants,
            this.result,
            this.config
          );

          if (candidates.length < num) {
            this.$message.error('符合条件的候选人数量不足');
            return;
          }

          // 保存候选人用于显示
          this.currentCandidates = candidates;

          // 随机抽取中奖者
          const winners = randomSelectWinners(candidates, num);

          // 添加照片信息
          this.resArr = winners.map(winner => {
            const photo = this.photos.find((d) => d.name === winner.realName);
            return {
              ...winner,
              photo: photo ? photo.value : null
            };
          });

          // 保存结果到store
          if (!this.result[prizeLevel]) {
            this.$set(this.result, prizeLevel, {});
          }
          if (!this.result[prizeLevel][prizeName]) {
            this.$set(this.result[prizeLevel], prizeName, []);
          }

          const oldRes = this.result[prizeLevel][prizeName] || [];
          const newResult = Object.assign({}, this.result);
          newResult[prizeLevel][prizeName] = oldRes.concat(winners);
          this.result = newResult;

          window.TagCanvas.SetSpeed('rootcanvas', [5, 1]);
          this.running = !this.running;

          this.$nextTick(() => {
            this.reloadTagCanvas();
          });
        } catch (error) {
          this.$message.error('抽奖失败: ' + error.message);
          console.error(error);
        }
      }
    },
  },
};
</script>
<style lang="scss">
@import '@/assets/style/theme.scss';

#root {
  height: 100%;
  position: relative;
  background: $bg-gradient;
  background-attachment: fixed;
  overflow: hidden;

  .mask {
    -webkit-filter: blur(5px);
    filter: blur(5px);
  }

  header {
    height: 80px;
    line-height: 80px;
    position: relative;
    z-index: 1000;
    @include glassmorphism;
    border-bottom: 1px solid rgba(249, 215, 28, 0.2);

    .el-button {
      position: absolute;
      top: 15px;
      padding: 10px 20px;
      z-index: 9999;
      @include glassmorphism;
      border: 1px solid rgba(249, 215, 28, 0.3);
      border-radius: 10px;
      color: $huya-yellow-bright;
      font-size: 16px;
      font-weight: 500;
      transition: all 0.3s ease;

      &:hover {
        border-color: rgba(249, 215, 28, 0.8);
        @include neon-glow($huya-yellow, 0.5);
        transform: translateY(-2px);
      }

      &.con {
        right: 20px;
      }
      &.res {
        right: 180px;
      }
    }

    // 响应式：小屏幕下调整按钮位置和大小
    @media (max-width: 768px) {
      height: 60px;
      line-height: 60px;

      .el-button {
        padding: 8px 15px;
        font-size: 14px;
        top: 10px;

        &.con {
          right: 10px;
        }
        &.res {
          right: 140px;
        }
      }
    }
  }

  .audio {
    position: absolute;
    top: 100px;
    right: 30px;
    width: 50px;
    height: 50px;
    line-height: 50px;
    border: 2px solid rgba(249, 215, 28, 0.5);
    border-radius: 50%;
    padding: 0;
    text-align: center;
    background: rgba(45, 27, 78, 0.6);
    backdrop-filter: blur(10px);
    color: $huya-yellow-bright;
    transition: all 0.3s ease;

    &:hover {
      border-color: rgba(249, 215, 28, 1);
      @include neon-glow($huya-yellow, 0.8);
      transform: scale(1.1);
    }

    .iconfont {
      position: relative;
      left: 1px;
      font-size: 20px;
    }

    // 响应式：小屏幕下调整音频按钮
    @media (max-width: 768px) {
      top: 70px;
      right: 15px;
      width: 40px;
      height: 40px;
      line-height: 40px;

      .iconfont {
        font-size: 16px;
      }
    }
  }

  .copy-right {
    position: absolute;
    right: 10px;
    bottom: 10px;
    color: $text-secondary;
    font-size: 12px;
    opacity: 0.6;
  }

  .bounce-enter-active {
    animation: bounce-in 1.5s;
  }
  .bounce-leave-active {
    animation: bounce-in 0s reverse;
  }
}

#main {
  height: 100%;
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;

  // 为 Canvas 容器添加磨砂玻璃外壳
  canvas {
    border-radius: 20px;
  }
}

// 磨砂玻璃容器样式 - 通过JS动态添加
.lottery-stage {
  position: relative;
  margin: 0 auto;
  background: rgba(45, 27, 78, 0.4);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  border: 2px solid rgba(249, 215, 28, 0.3);
  border-radius: 20px;
  box-shadow:
    0 0 40px rgba(249, 215, 28, 0.2),
    inset 0 0 60px rgba(45, 27, 78, 0.8);
  overflow: hidden;
  @include breathing-border(3s);

  // 尺寸由canvas内容撑开
  display: inline-block;

  &.active {
    @include breathing-border-fast;
  }

  canvas {
    display: block;
  }
}

#resbox {
  position: absolute;
  top: 50%;
  left: 50%;
  width: 1280px;
  max-width: 90vw;
  max-height: 85vh;
  transform: translateX(-50%) translateY(-50%);
  text-align: center;
  background: rgba(26, 11, 46, 0.95);
  backdrop-filter: blur(30px);
  border: 2px solid rgba(249, 215, 28, 0.6);
  border-radius: 20px;
  padding: 40px 20px;
  box-shadow: 0 0 80px rgba(249, 215, 28, 0.4);
  z-index: 100;
  overflow-y: auto;

  // 响应式：小屏幕下调整padding
  @media (max-width: 768px) {
    padding: 30px 15px;
  }

  @media (max-width: 480px) {
    padding: 20px 10px;
    max-width: 95vw;
  }

  p {
    color: $huya-yellow-bright;
    font-size: 40px;
    line-height: 60px;
    font-weight: bold;
    margin-bottom: 30px;
    @include neon-text-glow($huya-yellow);
    cursor: pointer;

    // 响应式字体大小
    @media (max-width: 768px) {
      font-size: 28px;
      line-height: 40px;
    }
  }

  .container {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(180px, 180px));
    max-width: fit-content;
    margin: 0 auto;
    gap: 20px;
    justify-content: center;

    // 限制最多5列
    @media (min-width: 1201px) {
      grid-template-columns: repeat(auto-fit, minmax(180px, calc((100% - 80px) / 5)));
      max-width: calc(180px * 5 + 20px * 4);
    }

    // 响应式：小屏幕下调整列数和间距
    @media (max-width: 1200px) {
      grid-template-columns: repeat(auto-fit, minmax(180px, calc((100% - 60px) / 4)));
      max-width: calc(180px * 4 + 20px * 3);
    }

    @media (max-width: 900px) {
      grid-template-columns: repeat(auto-fit, minmax(140px, calc((100% - 30px) / 3)));
      max-width: calc(140px * 3 + 15px * 2);
      gap: 15px;
    }

    @media (max-width: 600px) {
      grid-template-columns: repeat(auto-fit, minmax(120px, calc((100% - 10px) / 2)));
      max-width: calc(120px * 2 + 10px * 1);
      gap: 10px;
    }

    @media (max-width: 400px) {
      grid-template-columns: 1fr;
      max-width: 180px;
    }
  }

  .itemres {
    background: rgba(45, 27, 78, 0.8);
    backdrop-filter: blur(15px);
    width: 180px;
    height: 240px;
    border-radius: 15px;
    border: 2px solid rgba(249, 215, 28, 0.5);
    font-weight: bold;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    position: relative;
    animation: card-pop 0.6s cubic-bezier(0.68, -0.55, 0.265, 1.55);
    transition: all 0.3s ease;
    color: $text-primary;

    @for $i from 1 through 20 {
      &:nth-child(#{$i}) {
        animation-delay: #{$i * 0.15}s;
      }
    }

    &:hover {
      transform: translateY(-5px) scale(1.05);
      border-color: rgba(249, 215, 28, 1);
      box-shadow: 0 8px 30px rgba(249, 215, 28, 0.5);
    }

    // 响应式：小屏幕下调整卡片大小
    @media (max-width: 768px) {
      width: 140px;
      height: 200px;
    }

    @media (max-width: 480px) {
      width: 120px;
      height: 180px;
    }

    .cont {
      display: flex;
      justify-content: center;
      align-items: center;
      flex-direction: column;
      line-height: normal;
      padding: 15px;
      text-align: center;
    }

    .photo-wrapper {
      position: relative;
      display: flex;
      align-items: center;
      justify-content: center;
      width: 100%;
      height: 100%;

      img {
        border-radius: 10px;
        object-fit: cover;
      }
    }

    .prize-label {
      position: absolute;
      bottom: 0;
      left: 0;
      right: 0;
      background: linear-gradient(135deg, #f9d71c 0%, #ffd700 100%);
      color: $huya-purple-dark;
      font-size: 14px;
      font-weight: bold;
      padding: 8px 5px;
      text-align: center;
      line-height: normal;
      border-bottom-left-radius: 13px;
      border-bottom-right-radius: 13px;
    }

    &.numberOver::before {
      content: attr(data-id);
      width: 30px;
      height: 22px;
      line-height: 22px;
      background-color: $huya-yellow;
      color: $huya-purple-dark;
      position: absolute;
      bottom: 0;
      left: 0;
      font-size: 14px;
      font-weight: bold;
      z-index: 1;
      border-bottom-left-radius: 13px;
    }
  }
}
</style>
