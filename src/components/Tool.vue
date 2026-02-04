<template>
  <div id="tool">
    <el-button @click="startHandler" type="primary" size="mini">{{
      running ? '停止' : '开始'
    }}</el-button>
    <el-button size="mini" @click="showRemoveoptions = true">
      重置
    </el-button>

    <!-- 抽奖配置对话框 -->
    <el-dialog
      :append-to-body="true"
      :visible.sync="showSetwat"
      class="setwat-dialog"
      width="500px"
    >
      <el-form ref="form" :model="form" label-width="100px" size="mini">
        <el-form-item label="奖品等级">
          <el-select
            v-model="form.prizeLevel"
            placeholder="请选择奖品等级"
            @change="onPrizeLevelChange"
          >
            <el-option
              :label="level"
              :value="level"
              v-for="level in prizeLevels"
              :key="level"
            ></el-option>
          </el-select>
        </el-form-item>

        <!-- 所有等级：显示奖品复选框 -->
        <el-form-item label="选择奖品" v-if="form.prizeLevel">
          <el-checkbox-group v-model="form.selectedPrizeNames">
            <div v-for="(prize, index) in currentPrizes" :key="index" :style="{ marginBottom: '8px' }">
              <el-checkbox :label="prize.name">
                {{ prize.name }} x {{ prize.quantity }}
                <span v-if="getPrizeRemain(prize) < prize.quantity" :style="{ color: '#ff6b6b', fontSize: '12px' }">
                  (剩余: {{ getPrizeRemain(prize) }})
                </span>
              </el-checkbox>
            </div>
          </el-checkbox-group>
          <div :style="{ marginTop: '10px', fontSize: '12px', color: '#999' }">
            提示: 勾选本次要抽取的奖品
          </div>
        </el-form-item>

        <el-form-item label=" " v-if="form.prizeLevel && form.selectedPrizeNames.length > 0">
          <div>
            <span>
              选中奖品总数:&nbsp;
              <span class="colorred">{{ selectedPrizesTotalQuantity }}</span>
            </span>
            <span :style="{ marginLeft: '20px' }">
              剩余数量:&nbsp;
              <span class="colorred">{{ selectedPrizesRemainQuantity }}</span>
            </span>
          </div>
        </el-form-item>

        <!-- 抽取方式：固定为"一次抽取完选中的奖品" -->
        <el-form-item label="抽取方式" v-if="form.selectedPrizeNames.length > 0">
          <el-input value="一次抽取完选中的奖品" :disabled="true"></el-input>
        </el-form-item>

        <el-form-item>
          <el-button type="primary" @click="onSubmit">立即抽奖</el-button>
          <el-button @click="showSetwat = false">取消</el-button>
        </el-form-item>
      </el-form>
    </el-dialog>

    <!-- 重置选项对话框 -->
    <el-dialog
      :visible.sync="showRemoveoptions"
      width="300px"
      class="c-removeoptions"
      :append-to-body="true"
    >
      <el-form ref="form" :model="removeInfo" label-width="80px" size="mini">
        <el-form-item label="重置选项">
          <el-radio-group v-model="removeInfo.type">
            <el-radio border :label="0">重置全部数据</el-radio>
            <el-radio border :label="1">重置抽奖配置</el-radio>
            <el-radio border :label="2">重置人员名单</el-radio>
            <el-radio border :label="3">重置奖品配置</el-radio>
            <el-radio border :label="4">重置照片</el-radio>
            <el-radio border :label="5">重置抽奖结果</el-radio>
          </el-radio-group>
        </el-form-item>
        <el-form-item>
          <el-button type="primary" @click="resetConfig">确定重置</el-button>
          <el-button @click="showRemoveoptions = false">取消</el-button>
        </el-form-item>
      </el-form>
    </el-dialog>
  </div>
</template>

<script>
import {
  clearData,
  removeData,
  configField,
  resultField,
  participantsField,
  prizesField
} from '@/helper/index';
import { generateCandidates } from '@/helper/algorithm';
import { database, DB_STORE_NAME } from '@/helper/db';

export default {
  props: {
    running: Boolean,
    closeRes: Function
  },
  computed: {
    config() {
      return this.$store.state.config;
    },
    prizes() {
      return this.$store.state.prizes;
    },
    participants() {
      return this.$store.state.participants;
    },
    result() {
      return this.$store.state.result;
    },
    prizeLevels() {
      return Object.keys(this.prizes);
    },
    currentPrizes() {
      if (!this.form.prizeLevel) return [];
      return this.prizes[this.form.prizeLevel] || [];
    },
    // 获取选中的奖品对象列表
    selectedPrizes() {
      if (!this.form.selectedPrizeNames || this.form.selectedPrizeNames.length === 0) {
        return [];
      }
      return this.currentPrizes.filter(prize =>
        this.form.selectedPrizeNames.includes(prize.name)
      );
    },
    // 选中奖品的总数量
    selectedPrizesTotalQuantity() {
      return this.selectedPrizes.reduce((sum, prize) => sum + prize.quantity, 0);
    },
    // 选中奖品的剩余数量
    selectedPrizesRemainQuantity() {
      if (!this.form.prizeLevel || this.selectedPrizes.length === 0) return 0;
      const levelResults = this.result[this.form.prizeLevel];
      if (!levelResults) return this.selectedPrizesTotalQuantity;

      let usedCount = 0;
      this.selectedPrizes.forEach(prize => {
        const prizeResults = levelResults[prize.name] || [];
        usedCount += prizeResults.length;
      });
      return this.selectedPrizesTotalQuantity - usedCount;
    },
    // 判断是否是特一二等奖（现在所有等级逻辑统一，这个属性可能不再需要，但保留兼容）
    isTopPrize() {
      return ['特等奖', '一等奖', '二等奖'].includes(this.form.prizeLevel);
    },
    selectedPrize() {
      if (!this.form.prizeLevel || !this.form.prizeName) return null;
      const prizes = this.prizes[this.form.prizeLevel] || [];
      return prizes.find(p => p.name === this.form.prizeName);
    },
    remain() {
      // 返回选中奖品的剩余数量
      return this.selectedPrizesRemainQuantity;
    },
    candidatesCount() {
      // 计算选中奖品的候选人数（去重）
      if (!this.form.prizeLevel || this.selectedPrizes.length === 0) {
        return 0;
      }

      // 合并选中奖品的候选人（去重）
      const allCandidatesMap = new Map();
      this.selectedPrizes.forEach(prize => {
        try {
          const candidates = generateCandidates(
            this.form.prizeLevel,
            prize.name,
            prize,
            this.participants,
            this.result,
            this.config
          );
          candidates.forEach(candidate => {
            allCandidatesMap.set(candidate.displayName, candidate);
          });
        } catch (error) {
          // 忽略错误
        }
      });
      return allCandidatesMap.size;
    }
  },
  data() {
    return {
      showSetwat: false,
      showRemoveoptions: false,
      removeInfo: { type: 0 },
      form: {
        prizeLevel: '',
        prizeName: '',
        mode: 1,
        qty: 1,
        selectedPrizeNames: [] // 选中的奖品名称列表
      }
    };
  },
  watch: {
    showRemoveoptions(v) {
      if (!v) {
        this.removeInfo.type = 0;
      }
    }
  },
  methods: {
    onPrizeLevelChange() {
      // 清空选中的奖品
      this.form.selectedPrizeNames = [];
      this.form.prizeName = '';
    },
    onPrizeNameChange() {
      // 可以在这里添加额外逻辑
    },
    // 获取单个奖品的剩余数量
    getPrizeRemain(prize) {
      if (!this.form.prizeLevel) return prize.quantity;
      const levelResults = this.result[this.form.prizeLevel];
      if (!levelResults || !levelResults[prize.name]) return prize.quantity;
      return prize.quantity - levelResults[prize.name].length;
    },
    resetConfig() {
      const type = this.removeInfo.type;
      this.$confirm('此操作将重置所选数据，是否继续?', '提示', {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning'
      })
        .then(() => {
          switch (type) {
            case 0:
              clearData();
              this.$store.commit('setClearStore');
              database.clear(DB_STORE_NAME);
              break;
            case 1:
              removeData(configField);
              this.$store.commit('setClearConfig');
              break;
            case 2:
              removeData(participantsField);
              this.$store.commit('setClearParticipants');
              break;
            case 3:
              removeData(prizesField);
              this.$store.commit('setClearPrizes');
              break;
            case 4:
              database.clear(DB_STORE_NAME);
              this.$store.commit('setClearPhotos');
              break;
            case 5:
              removeData(resultField);
              this.$store.commit('setClearResult');
              break;
            default:
              break;
          }

          this.closeRes && this.closeRes();

          this.showRemoveoptions = false;
          this.$message({
            type: 'success',
            message: '重置成功!'
          });

          this.$nextTick(() => {
            this.$emit('resetConfig');
          });
        })
        .catch(() => {
          this.$message({
            type: 'info',
            message: '已取消'
          });
        });
    },
    onSubmit() {
      if (!this.form.prizeLevel) {
        return this.$message.error('请选择奖品等级');
      }

      // 检查是否选择了奖品
      if (!this.form.selectedPrizeNames || this.form.selectedPrizeNames.length === 0) {
        return this.$message.error('请至少勾选一个奖品');
      }

      // 检查选中的奖品是否还有剩余
      if (this.selectedPrizesRemainQuantity <= 0) {
        return this.$message.error('选中的奖品已全部抽完');
      }

      if (this.candidatesCount === 0) {
        return this.$message.error('没有符合条件的候选人');
      }

      const num = this.selectedPrizesRemainQuantity;
      if (num > this.candidatesCount) {
        return this.$message.error(
          `抽取人数(${num})超过符合条件的候选人数量(${this.candidatesCount})`
        );
      }

      this.showSetwat = false;
      this.$emit('toggle', {
        prizeLevel: this.form.prizeLevel,
        prizeName: null,
        prize: null,
        num: num,
        remain: num,
        isLevelDraw: true,
        prizes: this.selectedPrizes
      });
    },
    startHandler() {
      this.$emit('toggle');
      if (!this.running) {
        if (this.participants.length === 0) {
          this.$message.error('请先在抽奖配置中导入人员名单');
          return;
        }
        if (Object.keys(this.prizes).length === 0) {
          this.$message.error('请先在抽奖配置中导入奖品配置');
          return;
        }
        this.showSetwat = true;
      }
    }
  }
};
</script>
<style lang="scss">
@import '@/assets/style/theme.scss';

#tool {
  position: fixed;
  width: auto;
  top: 50%;
  right: 20px;
  transform: translateY(-50%);
  text-align: center;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  z-index: 999;

  .el-button {
    width: 80px;
    height: 80px;
    border-radius: 50%;
    font-size: 14px;
    font-weight: bold;
    transition: all 0.3s ease;

    &:first-child {
      width: 120px;
      height: 120px;
      font-size: 18px;
      background: $btn-gradient;
      border: 3px solid rgba(249, 215, 28, 0.5);
      color: $huya-purple-dark;
      box-shadow: 0 8px 30px rgba(249, 215, 28, 0.4);

      &:hover {
        background: $btn-gradient-hover;
        box-shadow: 0 12px 40px rgba(249, 215, 28, 0.6);
        transform: translateY(-3px) scale(1.05);
        border-color: rgba(249, 215, 28, 1);
      }

      &:active {
        transform: translateY(-1px) scale(1.02);
      }
    }

    &:not(:first-child) {
      @include glassmorphism;
      border: 2px solid rgba(249, 215, 28, 0.3);
      color: $text-primary;

      &:hover {
        border-color: rgba(249, 215, 28, 0.8);
        @include neon-glow($huya-yellow, 0.5);
        transform: translateY(-2px) scale(1.05);
      }
    }
  }

  .el-button + .el-button {
    margin-top: 20px;
    margin-left: 0px;
  }

  // 响应式：小屏幕下调整按钮大小
  @media (max-width: 768px) {
    right: 10px;

    .el-button {
      &:first-child {
        width: 100px;
        height: 100px;
        font-size: 16px;
      }

      &:not(:first-child) {
        width: 70px;
        height: 70px;
        font-size: 13px;
      }
    }

    .el-button + .el-button {
      margin-top: 15px;
    }
  }
}

.setwat-dialog {
  .el-dialog {
    @include glassmorphism;
    background: rgba(26, 11, 46, 0.95) !important;
    backdrop-filter: blur(30px);
    border: 2px solid rgba(249, 215, 28, 0.3);
    border-radius: 20px;
    box-shadow: 0 0 60px rgba(249, 215, 28, 0.3);
  }

  .el-dialog__header {
    border-bottom: 1px solid rgba(249, 215, 28, 0.2);
    padding: 20px;
  }

  .el-dialog__title {
    color: $huya-yellow-bright;
    font-size: 20px;
    font-weight: bold;
  }

  .el-dialog__body {
    color: $text-primary;
  }

  .el-form-item__label {
    color: $text-secondary;
  }

  .el-checkbox-group {
    width: 100%;
  }

  .el-checkbox {
    display: flex;
    align-items: center;
    margin-right: 0;
    color: $text-primary;

    &:hover {
      color: $huya-yellow-bright;
    }
  }

  .el-checkbox__label {
    color: $text-primary;
    font-size: 14px;
    white-space: normal;
    word-break: break-word;
  }

  .el-checkbox.is-checked .el-checkbox__label {
    color: $huya-yellow-bright;
  }

  .colorred {
    color: $huya-yellow-bright;
    font-weight: bold;
    font-size: 16px;
  }

  .el-button--primary {
    background: $btn-gradient;
    border: none;
    color: $huya-purple-dark;
    font-weight: bold;
    box-shadow: 0 4px 15px rgba(249, 215, 28, 0.4);

    &:hover {
      background: $btn-gradient-hover;
      transform: translateY(-2px);
      box-shadow: 0 6px 25px rgba(249, 215, 28, 0.6);
    }
  }
}

.c-removeoptions {
  .el-dialog {
    @include glassmorphism;
    background: rgba(26, 11, 46, 0.95) !important;
    backdrop-filter: blur(30px);
    border: 2px solid rgba(249, 215, 28, 0.3);
    border-radius: 20px;
    box-shadow: 0 0 60px rgba(249, 215, 28, 0.3);
  }

  .el-dialog__title {
    color: $huya-yellow-bright;
  }

  .el-dialog__body {
    color: $text-primary;
  }

  .el-radio.is-bordered + .el-radio.is-bordered {
    margin-left: 0px;
  }
  .el-radio.is-bordered {
    margin-bottom: 10px;
    background: rgba(45, 27, 78, 0.4);
    border-color: rgba(249, 215, 28, 0.3);
    color: $text-primary;

    &:hover {
      border-color: rgba(249, 215, 28, 0.8);
    }
  }
}
</style>
