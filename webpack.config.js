const path = require('path');
const webpack = require('webpack');

module.exports = (env, argv) => {
  const enabledSourceMap = (argv.mode === 'production') ? false : true;
  return {
    target: 'node',
    // メインとなるJavaScriptファイル（エントリーポイント）
    entry: './src/index.js',
    // ファイルの出力設定
    output: {
      //  出力ファイルのディレクトリ名
      path: path.resolve(__dirname, 'dist'),
      // 出力ファイル名
      filename: 'main.js',
      //    libraryTarget: 'commonjs'
    },
    resolve: {
      modules: [
        'node_modules',
        path.join(__dirname, 'src'),
      ]
    },
    module: {
      rules: [
        {
          test: /\.txt$/i,
          use: 'raw-loader',
        },
      ],
    },
    plugins: [
      // for CLI
      new webpack.BannerPlugin({ banner: "#!/usr/bin/env node", raw: true }),
    ]
  }
}
