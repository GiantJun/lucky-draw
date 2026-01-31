import Vue from 'vue';
import Vuex from 'vuex';
import {
  setData,
  resultField,
  participantsField,
  prizesField
} from '@/helper/index';

Vue.use(Vuex);

export default new Vuex.Store({
  state: {
    config: {
      name: '年会抽奖',
      enableExtraTimes: true,      // 额外抽奖次数功能开关
      winnerExcludesAll: true       // 一人中奖全部失效开关
    },
    result: {},  // 格式: { '特等奖': { 'iPhone 15 Pro': [{displayName, realName}] } }
    participants: [],  // 格式: [{ name, type, extraTimes }]
    prizes: {},  // 格式: { '特等奖': [{ name, quantity, eligibility }] }
    photos: []
  },
  mutations: {
    setClearConfig(state) {
      state.config = {
        name: '年会抽奖',
        enableExtraTimes: true,
        winnerExcludesAll: true
      };
    },
    setClearParticipants(state) {
      state.participants = [];
      setData(participantsField, []);
    },
    setClearPrizes(state) {
      state.prizes = {};
      setData(prizesField, {});
    },
    setClearPhotos(state) {
      state.photos = [];
    },
    setClearResult(state) {
      state.result = {};
      setData(resultField, {});
    },
    setClearStore(state) {
      state.config = {
        name: '年会抽奖',
        enableExtraTimes: true,
        winnerExcludesAll: true
      };
      state.result = {};
      state.participants = [];
      state.prizes = {};
      state.photos = [];
      setData(resultField, {});
      setData(participantsField, []);
      setData(prizesField, {});
    },
    setConfig(state, config) {
      state.config = config;
    },
    setResult(state, result = {}) {
      state.result = result;
      setData(resultField, state.result);
    },
    setParticipants(state, participants) {
      state.participants = participants;
      setData(participantsField, participants);
    },
    setPrizes(state, prizes) {
      state.prizes = prizes;
      setData(prizesField, prizes);
    },
    setPhotos(state, photos) {
      state.photos = photos;
    }
  },
  actions: {},
  modules: {}
});
