module.exports = function(grunt) {

  // Project configuration.
  grunt.initConfig({
    jsdoc : {
      dist : {
        src: ['lib/**/*.js', 'test/*.js'], 
        options: {
            destination: 'doc'
        }
      }
    }
});

  // Load the plugin that provides the "uglify" task.
  grunt.loadNpmTasks('grunt-jsdoc');

  // Default task(s).
  grunt.registerTask('default', ['jsdoc']);
};