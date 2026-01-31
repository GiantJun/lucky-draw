<template>
  <div id="tool">
    <el-button @click="startHandler" type="primary" size="mini">{{
      running ? '停止' : '开始'
    }}</el-button>
    <el-button size="mini" @click="showRemoveoptions = true">
      重置
    </el-button>
    <el-button size="mini" @click="showImportphoto = true">
      导入照片
    </el-button>

    <!-- 抽奖配置对话框 -->
    <el-dialog
      :append-to-body="true"
      :visible.sync="showSetwat"
      class="setwat-dialog"
      width="450px"
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

        <!-- 特一二等奖选择抽取模式 -->
        <el-form-item label="抽取模式" v-if="form.prizeLevel && isTopPrize">
          <el-select v-model="form.drawMode" placeholder="请选择抽取模式" @change="onDrawModeChange">
            <el-option label="一次抽取完整个等级" value="level"></el-option>
            <el-option label="选择具体奖品" value="single"></el-option>
          </el-select>
        </el-form-item>

        <!-- 特一二等奖-整个等级模式：显示整个等级信息 -->
        <el-form-item label="奖品列表" v-if="form.prizeLevel && isTopPrize && form.drawMode === 'level'">
          <div>
            <div v-for="(prize, index) in currentPrizes" :key="index" :style="{ marginBottom: '5px' }">
              {{ prize.name }} x {{ prize.quantity }}
            </div>
          </div>
        </el-form-item>

        <el-form-item label=" " v-if="form.prizeLevel && isTopPrize && form.drawMode === 'level'">
          <div>
            <span>
              等级总数:&nbsp;
              <span class="colorred">{{ levelTotalQuantity }}</span>
            </span>
            <span :style="{ marginLeft: '20px' }">
              剩余数量:&nbsp;
              <span class="colorred">{{ levelRemainQuantity }}</span>
            </span>
          </div>
          <div :style="{ marginTop: '5px' }">
            <span>
              符合条件候选人:&nbsp;
              <span class="colorred">{{ candidatesCount }}</span>
            </span>
          </div>
        </el-form-item>

        <!-- 特一二等奖-单个奖品模式 或 三等奖：选择具体奖品 -->
        <el-form-item label="具体奖品" v-if="form.prizeLevel && (!isTopPrize || form.drawMode === 'single')">
          <el-select
            v-model="form.prizeName"
            placeholder="请选择具体奖品"
            @change="onPrizeNameChange"
          >
            <el-option
              :label="prize.name"
              :value="prize.name"
              v-for="(prize, index) in currentPrizes"
              :key="index"
            ></el-option>
          </el-select>
        </el-form-item>

        <el-form-item label=" " v-if="form.prizeName && selectedPrize && (!isTopPrize || form.drawMode === 'single')">
          <div>
            <span>
              奖品总数:&nbsp;
              <span class="colorred">{{ selectedPrize.quantity }}</span>
            </span>
            <span :style="{ marginLeft: '20px' }">
              剩余数量:&nbsp;
              <span class="colorred">{{ remain }}</span>
            </span>
          </div>
          <div :style="{ marginTop: '5px' }">
            <span>
              符合条件候选人:&nbsp;
              <span class="colorred">{{ candidatesCount }}</span>
            </span>
          </div>
        </el-form-item>

        <!-- 特一二等奖-整个等级模式：不显示抽取方式选择 -->
        <el-form-item label="抽取方式" v-if="isTopPrize && form.drawMode === 'level'">
          <el-input value="一次抽取完" :disabled="true"></el-input>
        </el-form-item>

        <!-- 特一二等奖-单个奖品模式 或 三等奖：可以选择抽取方式 -->
        <el-form-item label="抽取方式" v-if="!isTopPrize || form.drawMode === 'single'">
          <el-select v-model="form.mode" placeholder="请选取本次抽取方式">
            <el-option label="抽1人" :value="1"></el-option>
            <el-option label="抽5人" :value="5"></el-option>
            <el-option label="一次抽取完" :value="0"></el-option>
            <el-option label="自定义" :value="99"></el-option>
          </el-select>
        </el-form-item>

        <el-form-item label="抽取人数" v-if="(!isTopPrize || form.drawMode === 'single') && form.mode === 99">
          <el-input
            v-model="form.qty"
            type="number"
            :clearable="true"
            :min="1"
            :max="remain ? remain : 100"
            :step="1"
          ></el-input>
        </el-form-item>

        <el-form-item>
          <el-button type="primary" @click="onSubmit">立即抽奖</el-button>
          <el-button @click="showSetwat = false">取消</el-button>
        </el-form-item>
      </el-form>
    </el-dialog>

    <!-- 导入照片对话框 -->
    <Importphoto
      :visible.sync="showImportphoto"
      @getPhoto="$emit('getPhoto')"
    ></Importphoto>

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
import Importphoto from './Importphoto';
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
    // 判断是否是特一二等奖
    isTopPrize() {
      return ['特等奖', '一等奖', '二等奖'].includes(this.form.prizeLevel);
    },
    // 整个等级的总数量
    levelTotalQuantity() {
      if (!this.form.prizeLevel) return 0;
      const prizes = this.currentPrizes;
      return prizes.reduce((sum, prize) => sum + prize.quantity, 0);
    },
    // 整个等级的剩余数量
    levelRemainQuantity() {
      if (!this.form.prizeLevel) return 0;
      const levelResults = this.result[this.form.prizeLevel];
      if (!levelResults) return this.levelTotalQuantity;

      let usedCount = 0;
      Object.values(levelResults).forEach(prizeResults => {
        usedCount += prizeResults.length;
      });
      return this.levelTotalQuantity - usedCount;
    },
    selectedPrize() {
      if (!this.form.prizeLevel || !this.form.prizeName) return null;
      const prizes = this.prizes[this.form.prizeLevel] || [];
      return prizes.find(p => p.name === this.form.prizeName);
    },
    remain() {
      // 如果是特一二等奖且选择整个等级模式，返回整个等级的剩余数量
      if (this.isTopPrize && this.form.drawMode === 'level') {
        return this.levelRemainQuantity;
      }
      // 否则返回单个奖品的剩余数量
      if (!this.selectedPrize) return 0;
      const levelResults = this.result[this.form.prizeLevel];
      if (!levelResults) return this.selectedPrize.quantity;
      const prizeResults = levelResults[this.form.prizeName] || [];
      return this.selectedPrize.quantity - prizeResults.length;
    },
    candidatesCount() {
      // 特一二等奖且选择整个等级模式
      if (this.isTopPrize && this.form.prizeLevel && this.form.drawMode === 'level') {
        // 获取该等级所有奖品的参与人员类别
        const prizes = this.currentPrizes;
        if (prizes.length === 0) return 0;

        // 合并所有奖品的候选人（去重）
        const allCandidatesMap = new Map();
        prizes.forEach(prize => {
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

      // 单个奖品模式（包括特一二等奖选择单个奖品，以及三等奖）
      if (!this.selectedPrize) return 0;
      try {
        const candidates = generateCandidates(
          this.form.prizeLevel,
          this.form.prizeName,
          this.selectedPrize,
          this.participants,
          this.result,
          this.config
        );
        return candidates.length;
      } catch (error) {
        return 0;
      }
    }
  },
  components: { Importphoto },
  data() {
    return {
      showSetwat: false,
      showImportphoto: false,
      showRemoveoptions: false,
      removeInfo: { type: 0 },
      form: {
        prizeLevel: '',
        prizeName: '',
        mode: 1,
        qty: 1,
        drawMode: 'level' // 'level' 表示整个等级，'single' 表示单个奖品
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
      this.form.prizeName = '';
      // 特一二等奖默认为整个等级模式
      if (this.isTopPrize) {
        this.form.drawMode = 'level';
      } else {
        this.form.drawMode = 'single';
      }
    },
    onDrawModeChange() {
      // 切换抽取模式时，清空具体奖品选择
      this.form.prizeName = '';
    },
    onPrizeNameChange() {
      // 可以在这里添加额外逻辑
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

      // 特一二等奖-整个等级模式
      if (this.isTopPrize && this.form.drawMode === 'level') {
        // 检查整个等级是否还有剩余
        if (this.levelRemainQuantity <= 0) {
          return this.$message.error('该等级奖品已全部抽完');
        }
        if (this.candidatesCount === 0) {
          return this.$message.error('没有符合条件的候选人');
        }

        const num = this.levelRemainQuantity;
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
          prizes: this.currentPrizes
        });
        return;
      }

      // 单个奖品模式（特一二等奖选择单个奖品 或 三等奖）
      if (!this.form.prizeName) {
        return this.$message.error('请选择具体奖品');
      }
      if (this.remain <= 0) {
        return this.$message.error('该奖品剩余数量不足');
      }
      if (this.candidatesCount === 0) {
        return this.$message.error('没有符合条件的候选人');
      }

      let num = 1;
      if (this.form.mode === 1 || this.form.mode === 5) {
        num = this.form.mode;
      } else if (this.form.mode === 0) {
        num = this.remain;
      } else if (this.form.mode === 99) {
        num = parseInt(this.form.qty);
      }

      if (this.form.mode === 99) {
        if (num <= 0) {
          return this.$message.error('必须输入本次抽取人数');
        }
        if (num > this.remain) {
          return this.$message.error('本次抽奖人数已超过本奖品的剩余数量');
        }
      }

      if ((this.form.mode === 1 || this.form.mode === 5) && num > this.remain) {
        return this.$message.error('本次抽奖人数已超过本奖品的剩余数量');
      }

      if (num > this.candidatesCount) {
        return this.$message.error(
          `抽取人数(${num})超过符合条件的候选人数量(${this.candidatesCount})`
        );
      }

      this.showSetwat = false;
      this.$emit('toggle', {
        prizeLevel: this.form.prizeLevel,
        prizeName: this.form.prizeName,
        prize: this.selectedPrize,
        num: num,
        remain: this.remain,
        isLevelDraw: false
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
#tool {
  position: fixed;
  width: 60px;
  top: 50%;
  right: 20px;
  transform: translateY(-50%);
  text-align: center;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  .el-button + .el-button {
    margin-top: 20px;
    margin-left: 0px;
  }
}
.setwat-dialog {
  .colorred {
    color: red;
    font-weight: bold;
  }
}
.c-removeoptions {
  .el-dialog {
    height: 350px;
  }
  .el-radio.is-bordered + .el-radio.is-bordered {
    margin-left: 0px;
  }
  .el-radio.is-bordered {
    margin-bottom: 10px;
  }
}
</style>
