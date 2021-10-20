<template>
  <div class="container">
    <div>
      <h2>First Name</h2>
      <input class="form" type="text" v-model="firstName"/>
    </div>
    <div>
      <h2>Last Name</h2>
      <input class="form" type="text" v-model="lastName"/>
    </div>
    <div>
      <h2>Known languages:</h2>
      <input type="checkbox" id="Java" value="Java">Java<br>
      <input type="checkbox" id="Python" value="Python">Python<br>
      <input type="checkbox" id="PHP" value="PHP">PHP<br>
      <input type="checkbox" id="Ruby" value="Ruby">Ruby<br>
    </div>
    <div>
      <h2>CV file</h2>
      <input type="file" id="file" ref="file" v-on:change="handleFileUpload()"/>
    </div>
    <div>
      <h2>Submit</h2>
      <input class="button" type="submit" value="Submit!" v-on:click="submitApplication"/>
    </div>

    <div>
      <h2>Search the CV database:</h2>
      <input class="form" type="text" v-model="query"/>
      <input class="search-button" type="submit" value="Search!" v-on:click="queryDatabase"/>
    </div>

  </div>
</template>

<script>
import axios from 'axios';

export default {
  name: 'App',
  components: {},
  data() {
    return {
      firstName: '',
      lastName: '',
      myFile: '',
      query: '',
      allLanguages: ['Java', 'Python', 'PHP', 'Ruby'],
      knownLanguages: []
    }
  },
  methods: {

    async handleFileUpload() {
      this.myFile = this.$refs.file.files[0];
    },
    async submitApplication() {

      for (let i in this.allLanguages)
        if (document.getElementById(this.allLanguages[i]).checked) {
          this.knownLanguages.push(this.allLanguages[i])
        }
      let formData = new FormData();
      formData.append('file', this.myFile);

      axios.post('/api/articles',
          {
            headers: {
              'Content-Type': 'multipart/form-data'
            },
            body: {
              firstName: this.firstName,
              lastName: this.lastName,
              knownLanguages: this.knownLanguages,
              cv: formData
            }
          }
      ).then(res =>
          console.log(res.data))
          .catch(function () {
            console.log('FAILURE!!');
          });
    },
    queryDatabase() {
    //todo  // here in the GET URL will come the this.query variable from the input form, f.ex "Java"
      axios.get('/api/articles/' + this.query,
          {
            headers: {
              'Content-Type': 'multipart/form-data'
            }
          }
      ).then(res =>
          console.log(res.data))
          .catch(function () {
            console.log('FAILURE!!');
          });
    }
  }
}
</script>

<style>
#app {
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  text-align: center;
  color: #2c3e50;
  margin-top: 60px;
  font-family: 'Source Sans Pro', -apple-system, BlinkMacSystemFont, 'Segoe UI',
  Roboto, 'Helvetica Neue', Arial, sans-serif;
  font-size: 16px;
  word-spacing: 1px;
  -ms-text-size-adjust: 100%;
  -webkit-text-size-adjust: 100%;
  box-sizing: border-box;
  margin-bottom: 5%;
}

.button {
  background-color: #118617; /* Green */
  border: none;
  color: white;
  padding: 15px 32px;
  text-align: center;
  text-decoration: none;
  display: inline-block;
  font-size: 16px;
}
.search-button{
  padding: 9px 25px;
  text-align: center;
  text-decoration: none;
  display: inline-block;
  font-size: 16px;
}
.form{
  font-size: 24px;
  width: 50%;
  padding: 12px 20px;
  margin: 8px 0;
  box-sizing: border-box;
  transition: width 0.4s ease-in-out;
  background-color: white;
  background-position: 10px 10px;
  background-repeat: no-repeat;
}
.container {
  max-width: 700px;
  margin: 30px auto;
  overflow: auto;
  text-align: center;
  min-height: 200px;
  padding: 60px;
  border-radius: 5px;
  box-shadow: 0px 10px 20px rgba(0, 0, 0, 0.1);
}
</style>
