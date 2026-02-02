<template>
  <el-dialog
    :visible="visible"
    :append-to-body="true"
    width="500px"
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
      <el-form ref="form" :model="form" size="mini" label-width="130px">
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

        <el-collapse accordion v-if="hasPrizes">
          <el-collapse-item title="查看奖品列表" name="1">
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
                <span class="prize-qty">数量: {{ prize.quantity }}</span>
                <span class="prize-eligibility"
                  >参与: {{ prize.eligibility }}</span
                >
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
.c-LotteryConfig {
  .el-dialog__body {
    max-height: 500px;
    .container {
      height: 100%;
      overflow-y: auto;
      padding: 0 10px;
    }
  }

  .prize-level {
    margin-bottom: 15px;
    .level-name {
      font-weight: bold;
      font-size: 14px;
      margin-bottom: 8px;
      color: #409eff;
    }
    .prize-item {
      display: flex;
      align-items: center;
      padding: 5px 0;
      font-size: 12px;
      color: #666;
      .prize-name {
        flex: 1;
      }
      .prize-qty {
        margin: 0 10px;
      }
      .prize-eligibility {
        color: #999;
      }
    }
  }
}
</style>
