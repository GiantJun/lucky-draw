<template>
  <el-dialog
    :visible="visible"
    @close="$emit('update:visible', false)"
    width="700px"
    class="c-Result"
    :append-to-body="true"
  >
    <div class="dialog-title" slot="title">
      <span :style="{ fontSize: '18px' }">
        抽奖结果
      </span>
      <span :style="{ fontSize: '14px', color: '#999', marginLeft: '10px' }">
        (点击中奖人可以删除)
      </span>
    </div>
    <div v-if="resultList.length === 0" class="empty">
      暂无抽奖结果
    </div>
    <div
      v-for="(levelItem, levelIndex) in resultList"
      :key="levelIndex"
      class="level-group"
    >
      <div class="level-name">{{ levelItem.level }}</div>
      <div
        v-for="(prizeItem, prizeIndex) in levelItem.prizes"
        :key="prizeIndex"
        class="prize-row"
      >
        <div class="prize-name">{{ prizeItem.prizeName }}</div>
        <div class="winners">
          <span v-if="prizeItem.winners.length === 0" class="no-winner">
            暂未抽奖
          </span>
          <span
            class="winner-card"
            v-for="(winner, winnerIndex) in prizeItem.winners"
            :key="winnerIndex"
            @click="deleteWinner(levelItem.level, prizeItem.prizeName, winner)"
          >
            {{ winner.realName }}
          </span>
        </div>
      </div>
    </div>

    <!-- 导出按钮区域 -->
    <div v-if="resultList.length > 0" class="export-section">
      <el-button
        type="primary"
        icon="el-icon-download"
        size="medium"
        @click="exportResults">
        导出结果
      </el-button>
    </div>
  </el-dialog>
</template>
<script>
export default {
  name: 'c-Result',
  props: {
    visible: Boolean
  },
  computed: {
    result: {
      get() {
        return this.$store.state.result;
      },
      set(val) {
        this.$store.commit('setResult', val);
      }
    },
    prizes() {
      return this.$store.state.prizes;
    },
    resultList() {
      const list = [];

      // 按奖品配置的顺序遍历
      for (const level in this.prizes) {
        if (this.prizes.hasOwnProperty(level)) {
          const levelPrizes = this.prizes[level];
          const prizeResults = [];

          levelPrizes.forEach(prize => {
            const winners =
              (this.result[level] && this.result[level][prize.name]) || [];
            prizeResults.push({
              prizeName: prize.name,
              winners: winners
            });
          });

          list.push({
            level: level,
            prizes: prizeResults
          });
        }
      }

      return list;
    }
  },
  methods: {
    deleteWinner(level, prizeName, winner) {
      this.$confirm(
        `此操作将移除 ${winner.realName} 的中奖记录，确认删除?`,
        '警告',
        {
          confirmButtonText: '确定',
          cancelButtonText: '取消',
          type: 'warning'
        }
      )
        .then(() => {
          const result = JSON.parse(JSON.stringify(this.result));
          if (result[level] && result[level][prizeName]) {
            result[level][prizeName] = result[level][prizeName].filter(
              w => w.displayName !== winner.displayName
            );
            this.result = result;
            this.$message({
              type: 'success',
              message: '删除成功!'
            });
          }
        })
        .catch(() => {
          this.$message({
            type: 'info',
            message: '已取消'
          });
        });
    },
    exportResults() {
      // 检查是否有结果数据
      if (!this.result || Object.keys(this.result).length === 0) {
        this.$message.warning('暂无抽奖结果可导出');
        return;
      }

      // 生成 CSV 内容
      const csvContent = this.generateCSV();

      // 创建 Blob 对象
      const blob = new Blob(['\ufeff' + csvContent], {
        type: 'text/csv;charset=utf-8;'
      });

      // 触发下载
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', `抽奖结果_${this.getTimestamp()}.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      this.$message.success('导出成功');
    },
    generateCSV() {
      // CSV 头部
      let csv = '奖品等级,奖品名称,中奖者姓名,显示名称\n';

      // 遍历结果数据
      for (const level in this.result) {
        if (this.result.hasOwnProperty(level)) {
          for (const prizeName in this.result[level]) {
            if (this.result[level].hasOwnProperty(prizeName)) {
              const winners = this.result[level][prizeName];
              winners.forEach(winner => {
                csv += `${level},${prizeName},${winner.realName},${winner.displayName}\n`;
              });
            }
          }
        }
      }

      return csv;
    },
    getTimestamp() {
      const now = new Date();
      return now.toISOString().replace(/[:.]/g, '-').substring(0, 19);
    }
  }
};
</script>
<style lang="scss">
@import '@/assets/style/theme.scss';

.c-Result {
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
    max-height: 600px;
    overflow-y: auto;
    color: $text-primary;
  }

  .empty {
    text-align: center;
    color: $text-secondary;
    padding: 40px 0;
    font-size: 14px;
  }

  .level-group {
    margin-bottom: 25px;
    border-bottom: 1px solid rgba(249, 215, 28, 0.2);
    padding-bottom: 15px;

    &:last-child {
      border-bottom: none;
    }

    .level-name {
      font-weight: bold;
      font-size: 18px;
      margin-bottom: 12px;
      color: $huya-yellow-bright;
      padding-left: 10px;
      border-left: 4px solid $huya-yellow;
      @include neon-text-glow($huya-yellow);
    }

    .prize-row {
      display: flex;
      margin-bottom: 10px;
      padding: 12px 15px;
      background: rgba(45, 27, 78, 0.4);
      backdrop-filter: blur(10px);
      border: 1px solid rgba(249, 215, 28, 0.2);
      border-radius: 8px;
      transition: all 0.3s ease;

      &:hover {
        background: rgba(45, 27, 78, 0.6);
        border-color: rgba(249, 215, 28, 0.5);
      }

      .prize-name {
        width: 150px;
        font-weight: 600;
        font-size: 15px;
        color: $text-primary;
        flex-shrink: 0;
        display: flex;
        align-items: center;
      }

      .winners {
        flex: 1;
        display: flex;
        flex-wrap: wrap;
        align-items: center;

        .no-winner {
          color: $text-muted;
          font-size: 13px;
        }

        .winner-card {
          display: inline-block;
          padding: 6px 14px;
          line-height: 24px;
          text-align: center;
          font-size: 14px;
          font-weight: 600;
          border-radius: 6px;
          border: 1px solid rgba(249, 215, 28, 0.4);
          background: rgba(45, 27, 78, 0.6);
          color: $huya-yellow-bright;
          margin-right: 8px;
          margin-bottom: 5px;
          cursor: pointer;
          transition: all 0.3s;

          &:hover {
            background: $btn-stop-gradient;
            color: #fff;
            border-color: #ff6b6b;
            transform: translateY(-2px);
            box-shadow: 0 4px 15px rgba(255, 107, 107, 0.4);
          }
        }
      }
    }
  }

  .export-section {
    text-align: center;
    padding-top: 20px;
    margin-top: 20px;
    border-top: 1px solid rgba(249, 215, 28, 0.2);
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
