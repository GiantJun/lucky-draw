<template>
  <el-dialog
    :visible="visible"
    :append-to-body="true"
    width="650px"
    @close="$emit('update:visible', false)"
    class="c-LotteryConfig"
  >
    <div class="c-LotteryConfigtitle" slot="title">
      <span :style="{ fontSize: '16px', marginRight: '20px' }">
        抽奖配置
      </span>
      <el-button size="mini" type="primary" @click="onSubmit"
        >保存配置</el-button
      >
      <el-button size="mini" @click="$emit('update:visible', false)"
        >取消</el-button
      >
    </div>
    <div class="container">
      <el-form ref="form" :model="form" size="mini" label-width="130px" label-position="left">
        <el-form-item label="抽奖标题">
          <el-input v-model="form.name"></el-input>
        </el-form-item>

        <el-divider>功能开关</el-divider>

        <el-form-item label="额外抽奖次数">
          <el-switch v-model="form.enableExtraTimes"></el-switch>
          <div :style="{ fontSize: '12px', color: '#999', marginTop: '5px' }">
            开启后使用CSV中配置的额外抽奖次数
          </div>
        </el-form-item>

        <el-form-item label="生效的奖品等级" v-if="form.enableExtraTimes">
          <el-select
            v-model="form.extraTimesLevels"
            multiple
            placeholder="请选择生效等级"
            :style="{ width: '100%' }"
          >
            <el-option label="特等奖" value="特等奖"></el-option>
            <el-option label="一等奖" value="一等奖"></el-option>
            <el-option label="二等奖" value="二等奖"></el-option>
            <el-option label="三等奖" value="三等奖"></el-option>
          </el-select>
          <div :style="{ fontSize: '12px', color: '#999', marginTop: '5px' }">
            只有被选中的等级才会应用额外抽奖次数
          </div>
        </el-form-item>

        <el-form-item label="一人中奖全部失效">
          <el-switch v-model="form.winnerExcludesAll"></el-switch>
          <div :style="{ fontSize: '12px', color: '#999', marginTop: '5px' }">
            开启后同一人的所有候选名只能中一个奖
          </div>
        </el-form-item>

        <el-divider>数据导入</el-divider>

        <el-form-item label="快速开始">
          <el-button
            size="mini"
            type="success"
            @click="loadExampleData"
            :loading="loadingExample"
          >
            加载示例数据
          </el-button>
          <div :style="{ fontSize: '12px', color: '#999', marginTop: '5px' }">
            自动导入项目自带的示例人员和奖品配置
          </div>
        </el-form-item>

        <el-form-item label="人员名单">
          <el-button size="mini" @click="triggerParticipantsUpload">
            导入CSV
          </el-button>
          <input
            type="file"
            ref="participantsFile"
            accept=".csv"
            @change="handleParticipantsUpload"
            style="display: none"
          />
          <div
            :style="{ fontSize: '12px', color: '#999', marginTop: '5px' }"
            v-if="participantsCount > 0"
          >
            已导入 {{ participantsCount }} 人
          </div>
        </el-form-item>

        <el-form-item label="奖品配置">
          <el-button size="mini" @click="triggerPrizesUpload">
            导入CSV
          </el-button>
          <input
            type="file"
            ref="prizesFile"
            accept=".csv"
            @change="handlePrizesUpload"
            style="display: none"
          />
          <div
            :style="{ fontSize: '12px', color: '#999', marginTop: '5px' }"
            v-if="prizesCount > 0"
          >
            已导入 {{ prizesCount }} 个奖项
          </div>
        </el-form-item>

        <el-divider>奖品信息</el-divider>

        <el-collapse accordion v-if="hasPrizes">
          <el-collapse-item title="查看奖品列表" name="1">
            <div class="prize-list-container">
              <div
                v-for="(prizes, level) in storePrizes"
                :key="level"
                class="prize-level"
              >
                <div class="level-name">{{ level }}</div>
                <div
                  v-for="(prize, index) in prizes"
                  :key="index"
                  class="prize-item"
                >
                  <span class="prize-name">{{ prize.name }}</span>
                  <span class="prize-qty">x {{ prize.quantity }}</span>
                </div>
              </div>
            </div>
          </el-collapse-item>
        </el-collapse>
      </el-form>
    </div>
  </el-dialog>
</template>
<script>
import { setData, configField, parseParticipantsCSV, parsePrizesCSV } from '@/helper/index';

export default {
  name: 'LotteryConfig',
  props: {
    visible: Boolean
  },
  computed: {
    form: {
      get() {
        return this.$store.state.config;
      },
      set(val) {
        return val;
      }
    },
    storePrizes() {
      return this.$store.state.prizes;
    },
    participantsCount() {
      return this.$store.state.participants.length;
    },
    prizesCount() {
      return Object.keys(this.storePrizes).length;
    },
    hasPrizes() {
      return this.prizesCount > 0;
    }
  },
  data() {
    return {
      loadingExample: false
    };
  },
  methods: {
    async loadExampleData() {
      // 如果已有数据，先确认是否覆盖
      if (this.participantsCount > 0 || this.prizesCount > 0) {
        try {
          await this.$confirm(
            '加载示例数据将覆盖当前已有的人员名单和奖品配置，是否继续？',
            '提示',
            {
              confirmButtonText: '确定',
              cancelButtonText: '取消',
              type: 'warning'
            }
          );
        } catch {
          return; // 用户取消
        }
      }

      this.loadingExample = true;
      try {
        // 读取人员名单示例
        const participantsResponse = await fetch('/人员名单示例.csv');
        if (!participantsResponse.ok) {
          throw new Error('无法加载人员名单示例文件');
        }
        const participantsText = await participantsResponse.text();
        const participants = parseParticipantsCSV(participantsText);

        if (participants.length === 0) {
          throw new Error('人员名单示例文件无有效数据');
        }

        // 读取奖品配置示例
        const prizesResponse = await fetch('/奖品配置示例.csv');
        if (!prizesResponse.ok) {
          throw new Error('无法加载奖品配置示例文件');
        }
        const prizesText = await prizesResponse.text();
        const prizes = parsePrizesCSV(prizesText);

        if (Object.keys(prizes).length === 0) {
          throw new Error('奖品配置示例文件无有效数据');
        }

        // 更新到 store（会覆盖现有数据）
        this.$store.commit('setParticipants', participants);
        this.$store.commit('setPrizes', prizes);

        this.$message.success(
          `成功加载示例数据: ${participants.length} 个人员, ${Object.keys(prizes).length} 个奖项`
        );
      } catch (error) {
        this.$message.error('加载示例数据失败: ' + error.message);
        console.error('Load example data error:', error);
      } finally {
        this.loadingExample = false;
      }
    },

    onSubmit() {
      if (this.participantsCount === 0) {
        this.$message.warning('请先导入人员名单');
        return;
      }
      if (this.prizesCount === 0) {
        this.$message.warning('请先导入奖品配置');
        return;
      }

      setData(configField, this.form);
      this.$store.commit('setConfig', this.form);
      this.$emit('update:visible', false);

      this.$message({
        message: '保存成功',
        type: 'success'
      });

      this.$nextTick(() => {
        this.$emit('resetconfig');
      });
    },

    triggerParticipantsUpload() {
      this.$refs.participantsFile.click();
    },

    triggerPrizesUpload() {
      this.$refs.prizesFile.click();
    },

    handleParticipantsUpload(event) {
      const file = event.target.files[0];
      if (!file) return;

      // 如果已有人员数据，先确认是否覆盖
      if (this.participantsCount > 0) {
        this.$confirm(
          '导入新的人员名单将覆盖当前已有的人员数据，是否继续？',
          '提示',
          {
            confirmButtonText: '确定',
            cancelButtonText: '取消',
            type: 'warning'
          }
        )
          .then(() => {
            this.processParticipantsFile(file);
          })
          .catch(() => {
            // 用户取消，清空文件选择
            event.target.value = '';
          });
      } else {
        this.processParticipantsFile(file);
      }

      // 清空input，允许重复上传同一文件
      event.target.value = '';
    },

    processParticipantsFile(file) {
      const reader = new FileReader();
      reader.onload = e => {
        try {
          const csvContent = e.target.result;
          const participants = parseParticipantsCSV(csvContent);

          if (participants.length === 0) {
            this.$message.error('CSV文件解析失败或无有效数据');
            return;
          }

          // 覆盖现有数据
          this.$store.commit('setParticipants', participants);
          this.$message.success(`成功导入 ${participants.length} 个人员`);
        } catch (error) {
          this.$message.error('CSV文件解析失败: ' + error.message);
        }
      };
      reader.readAsText(file, 'UTF-8');
    },

    handlePrizesUpload(event) {
      const file = event.target.files[0];
      if (!file) return;

      // 如果已有奖品数据，先确认是否覆盖
      if (this.prizesCount > 0) {
        this.$confirm(
          '导入新的奖品配置将覆盖当前已有的奖品数据，是否继续？',
          '提示',
          {
            confirmButtonText: '确定',
            cancelButtonText: '取消',
            type: 'warning'
          }
        )
          .then(() => {
            this.processPrizesFile(file);
          })
          .catch(() => {
            // 用户取消，清空文件选择
            event.target.value = '';
          });
      } else {
        this.processPrizesFile(file);
      }

      // 清空input，允许重复上传同一文件
      event.target.value = '';
    },

    processPrizesFile(file) {
      const reader = new FileReader();
      reader.onload = e => {
        try {
          const csvContent = e.target.result;
          const prizes = parsePrizesCSV(csvContent);

          if (Object.keys(prizes).length === 0) {
            this.$message.error('CSV文件解析失败或无有效数据');
            return;
          }

          // 覆盖现有数据
          this.$store.commit('setPrizes', prizes);
          this.$message.success(
            `成功导入 ${Object.keys(prizes).length} 个奖项`
          );
        } catch (error) {
          this.$message.error('CSV文件解析失败: ' + error.message);
        }
      };
      reader.readAsText(file, 'UTF-8');
    }
  }
};
</script>
<style lang="scss">
@import '@/assets/style/theme.scss';

.c-LotteryConfig {
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
  }

  .el-dialog__title {
    color: $huya-yellow-bright;
    font-size: 20px;
    font-weight: bold;
  }

  .el-dialog__body {
    max-height: 70vh;
    color: $text-primary;
    padding: 10px 20px;

    .container {
      height: 100%;
      overflow-y: auto;
      padding: 0 5px;
    }
  }

  .el-form-item__label {
    color: $text-secondary;
  }

  .el-form-item {
    margin-bottom: 15px;
  }

  .el-divider {
    margin: 15px 0;
    background-color: rgba(249, 215, 28, 0.2);
  }

  .el-divider__text {
    color: $text-secondary;
    background-color: rgba(26, 11, 46, 0.95);
  }

  .el-collapse {
    border: none;
    background: transparent;

    .el-collapse-item__header {
      background: rgba(45, 27, 78, 0.4);
      border: 1px solid rgba(249, 215, 28, 0.2);
      border-radius: 8px;
      color: $text-primary;
      padding: 0 15px;
      height: 40px;
      line-height: 40px;
      margin-bottom: 10px;
      transition: all 0.3s;

      &:hover {
        border-color: rgba(249, 215, 28, 0.5);
        background: rgba(45, 27, 78, 0.6);
      }

      .el-collapse-item__arrow {
        color: $huya-yellow-bright;
      }
    }

    .el-collapse-item__wrap {
      border: none;
      background: transparent;
    }

    .el-collapse-item__content {
      padding: 0;
      color: $text-primary;
    }
  }

  .prize-list-container {
    max-height: 300px;
    overflow-y: auto;
    padding: 10px;
    background: rgba(45, 27, 78, 0.2);
    border-radius: 8px;
  }

  .prize-level {
    margin-bottom: 15px;

    &:last-child {
      margin-bottom: 0;
    }

    .level-name {
      font-weight: bold;
      font-size: 13px;
      margin-bottom: 8px;
      color: $huya-yellow-bright;
      padding: 5px 10px;
      background: rgba(249, 215, 28, 0.1);
      border-radius: 4px;
      border-left: 3px solid $huya-yellow;
    }

    .prize-item {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 6px 10px;
      font-size: 12px;
      color: $text-secondary;
      border-radius: 4px;
      transition: all 0.2s;

      &:hover {
        background: rgba(249, 215, 28, 0.05);
      }

      .prize-name {
        flex: 1;
        color: $text-primary;
      }

      .prize-qty {
        color: $huya-yellow-bright;
        font-weight: 600;
        min-width: 50px;
        text-align: right;
      }
    }
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
</style>
