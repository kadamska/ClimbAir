const path = require("path");
const HtmlWebpackPlugin = require('html-webpack-plugin');

module.exports={
  mode: "development",
  entry: "./src/index.tsx",
  output: {
    path: path.resolve(__dirname, "dist"),
    filename: "bundle.js"
  },
  module: {
    rules: [
      {
        test: /\.tsx?$/,
        use: 'ts-loader',
        exclude: /node_modules/,
      },
      {
        test: /\.css$/,
        use: ['style-loader', 'css-loader']
      },
      {
        test: /\.(png|svg|jpg|jpeg|gif)$/i,
        type: 'asset/resource',
      },
    ],
  },
  resolve: {
    extensions: ['.tsx', '.ts', '.jsx', '.js'],
  },
  plugins: [
    new HtmlWebpackPlugin({
      template: './public/index.html',
    }),
  ],
  devServer: {
    static: path.join(__dirname, 'public'),
    compress: true,
    open: true,
    port: 9000,
    historyApiFallback: true,
  },
  // devServer: {
  //   port: "9500",
  //   static: ["./public"],
  //   open: true,
  //   hot: true,
  //   liveReload: true,
  //   historyApiFallback: true
  // },
}
