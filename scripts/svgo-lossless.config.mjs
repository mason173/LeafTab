export default {
  multipass: true,
  js2svg: {
    pretty: false,
    indent: 0,
  },
  plugins: [
    {
      name: 'preset-default',
      params: {
        overrides: {
          cleanupIds: false,
          collapseGroups: false,
          convertPathData: false,
          mergePaths: false,
          removeUnknownsAndDefaults: false,
          removeViewBox: false,
        },
      },
    },
    'sortAttrs',
  ],
};
