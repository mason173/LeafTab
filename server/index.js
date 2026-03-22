const { createApp } = require('./app');

const { app, port } = createApp();

app.listen(port, '0.0.0.0', () => {
  console.log(`Server is running on port ${port}`);
});
