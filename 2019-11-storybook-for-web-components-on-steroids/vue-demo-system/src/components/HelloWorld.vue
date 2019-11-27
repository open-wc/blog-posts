<template>
  <div class="hello">
    <h1>{{ msg }}</h1>
    <ul>
      <li v-for="demo in demos" v-on:click="showDemo(demo.name)">{{demo.name}}</li>
    </ul>

    <div v-html="demo"></div>
  </div>
</template>

<script>
export default {
  name: 'HelloWorld',
  props: {
    msg: {
      type: String,
      default: 'My Demo System',
    },
    demos: {
      type: Array,
      default: () => [
        { name: 'Demo One', content: '<h1>Hey there from demo one</h1>' },
        { name: 'Demo Two', content: '<h1>I am demo two</h1>' },
      ],
    },
  },
  methods: {
    showDemo: function(name) {
      this.demoIndex = this.demos.findIndex(el => el.name === name);
    },
  },
  data() {
    return {
      demoIndex: -1,
    };
  },
  computed: {
    demo() {
      if (this.demoIndex >= 0) {
        return this.demos[this.demoIndex].content;
      }
      return '<h1>Please select a demo by clicking in the menu</h1>';
    },
  },
};
</script>

<!-- Add "scoped" attribute to limit CSS to this component only -->
<style scoped>
h3 {
  margin: 40px 0 0;
}
ul {
  list-style-type: none;
  padding: 0;
}
li {
  display: inline-block;
  margin: 0 10px;
}
a {
  color: #42b983;
}

#demo-area {
  border: 1px solid #ccc;
  width: 70%;
  height: 200px;
  margin: 0 auto;
}
</style>
