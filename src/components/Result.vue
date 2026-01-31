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
            {{ winner.displayName }}
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
        `此操作将移除 ${winner.displayName} 的中奖记录，确认删除?`,
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
.c-Result {
  .el-dialog__body {
    max-height: 600px;
    overflow-y: auto;
  }

  .empty {
    text-align: center;
    color: #999;
    padding: 40px 0;
    font-size: 14px;
  }

  .level-group {
    margin-bottom: 25px;
    border-bottom: 1px solid #eee;
    padding-bottom: 15px;

    &:last-child {
      border-bottom: none;
    }

    .level-name {
      font-weight: bold;
      font-size: 16px;
      margin-bottom: 12px;
      color: #409eff;
      padding-left: 10px;
      border-left: 4px solid #409eff;
    }

    .prize-row {
      display: flex;
      margin-bottom: 10px;
      padding: 8px 10px;
      background-color: #f9f9f9;
      border-radius: 4px;

      &:hover {
        background-color: #f5f5f5;
      }

      .prize-name {
        width: 150px;
        font-weight: 600;
        font-size: 14px;
        color: #333;
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
          color: #999;
          font-size: 13px;
        }

        .winner-card {
          display: inline-block;
          padding: 4px 12px;
          line-height: 22px;
          text-align: center;
          font-size: 14px;
          font-weight: 600;
          border-radius: 4px;
          border: 1px solid #dcdfe6;
          background-color: #fff;
          margin-right: 8px;
          margin-bottom: 5px;
          cursor: pointer;
          transition: all 0.3s;

          &:hover {
            background-color: #f56c6c;
            color: #fff;
            border-color: #f56c6c;
            transform: translateY(-2px);
            box-shadow: 0 2px 8px rgba(245, 108, 108, 0.3);
          }
        }
      }
    }
  }

  .export-section {
    text-align: center;
    padding-top: 20px;
    margin-top: 20px;
    border-top: 1px solid #eee;
  }
}
</style>
