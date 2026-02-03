<template>
  <el-dialog
    :visible="visible"
    :append-to-body="true"
    width="300px"
    @close="$emit('update:visible', false)"
    class="c-Importphoto"
  >
    <el-row>
      <label for="idinput">抽奖号码</label>
      <el-input
        id="idinput"
        size="mini"
        type="number"
        v-model="id"
        :min="0"
        :max="config.number"
      ></el-input>
    </el-row>
    <el-row>
      <label for="idinput">照片选择</label>
      <span class="selectbg" :data-tip="filename">
        <input
          ref="uploadinput"
          class="upload"
          type="file"
          accept=".jpg,.png"
          @change="inputChange"
        />
      </span>
    </el-row>
    <el-row class="photo">
      <label>已选照片</label>
      <img v-if="value" :src="value" alt="img" :width="140" :height="140" />
      <span v-else>暂未选择</span>
    </el-row>
    <el-row>
      支持jpg和png，照片大小不能超过150kb,建议20-50kb，建议尺寸为160*160px
    </el-row>
    <el-row class="center">
      <el-button size="mini" type="primary" @click="saveHandler"
        >保存</el-button
      >
      <el-button size="mini" @click="$emit('update:visible', false)"
        >取消</el-button
      >
    </el-row>
  </el-dialog>
</template>
<script>
import { database, DB_STORE_NAME } from '@/helper/db';

export default {
  name: 'Importphoto',
  props: {
    visible: Boolean
  },
  computed: {
    config: {
      get() {
        return this.$store.state.config;
      }
    }
  },
  data() {
    return {
      id: 0,
      value: '',
      filename: '点击选择照片'
    };
  },
  methods: {
    inputChange(e) {
      const fileList = e.target.files;
      const formData = new FormData();
      formData.append('uploadImg', fileList[0]);
      const reader = new FileReader();
      const AllowImgFileSize = 1024 * 150;
      const file = fileList[0];
      if (file) {
        this.filename = file.name;
        reader.readAsDataURL(file);
        reader.onload = () => {
          if (
            AllowImgFileSize != 0 &&
            AllowImgFileSize < reader.result.length
          ) {
            return this.$message.error('不允许上传大于150KB的图片');
          } else {
            this.value = reader.result;
          }
        };
      }
    },
    async saveHandler() {
      const { id, value } = this;
      const ID = Number(id);
      if (!ID || ID <= 0) {
        return this.$message.error('号码必须大于0的整数');
      }
      if (!value) {
        return this.$message.error('请选择照片');
      }
      const Data = await database.get(DB_STORE_NAME, ID);
      const param = {
        id: ID,
        value
      };
      database[Data ? 'edit' : 'add'](
        DB_STORE_NAME,
        Data ? ID : param,
        Data ? param : null
      )
        .then(res => {
          if (res) {
            this.$refs.uploadinput.value = '';
            this.value = '';
            this.filename = '点击选择照片';
            this.$emit('update:visible', false);
            this.$emit('getPhoto');
            this.$message({
              message: '保存成功',
              type: 'success'
            });
          } else {
            this.$message.error('保存失败');
          }
        })
        .catch(err => {
          this.$message.error(err.message);
        });
    }
  }
};
</script>
<style lang="scss">
@import '@/assets/style/theme.scss';

.c-Importphoto {
  .el-dialog {
    height: 380px;
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
  }

  .el-dialog__body {
    color: $text-primary;
  }

  label {
    margin-right: 20px;
    vertical-align: top;
    color: $text-secondary;
  }

  .el-input {
    width: 140px;
  }

  .el-row {
    padding: 5px 0;
    color: $text-secondary;
    font-size: 12px;
  }

  .center {
    text-align: center;
  }

  .selectbg {
    display: inline-block;
    border: 1px solid rgba(249, 215, 28, 0.4);
    border-radius: 4px;
    background: rgba(45, 27, 78, 0.4);
    width: 140px;
    height: 32px;
    position: relative;
    box-sizing: border-box;
    transition: all 0.3s ease;

    &:hover {
      border-color: rgba(249, 215, 28, 0.8);
      background: rgba(45, 27, 78, 0.6);
    }

    &::before {
      content: attr(data-tip);
      width: 100%;
      height: 100%;
      text-align: center;
      position: absolute;
      top: 0;
      left: 0;
      line-height: 32px;
      cursor: pointer;
      overflow: hidden;
      font-size: 12px;
      color: $text-secondary;
    }

    .upload {
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      opacity: 0;
      z-index: 10;
      cursor: pointer;
    }
  }

  .photo {
    img {
      border: 2px solid rgba(249, 215, 28, 0.5);
      border-radius: 8px;
    }

    span {
      display: inline-block;
      border: 2px solid rgba(249, 215, 28, 0.3);
      background: rgba(45, 27, 78, 0.4);
      border-radius: 8px;
      width: 140px;
      height: 140px;
      line-height: 140px;
      text-align: center;
      position: relative;
      box-sizing: border-box;
      color: $text-muted;
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
