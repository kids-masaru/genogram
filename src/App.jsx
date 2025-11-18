/*
  src/App.jsx (修正版)
  
  【主な修正点】
  1. ヘッダーとメインコンテンツの "max-w-screen-2xl" (広すぎた) を "max-w-7xl" (1280px) に変更し、
     デザインを引き締めました。
  2. メインコンテンツの垂直方向の余白(padding)を "py-6 md:py-10" に調整し、
     ヘッダーやタブとの「間（ま）」を確保しました。
  3. タブのボタンリスト (<TabsList>) に "mx-auto" を追加し、
     PC幅の際に中央に配置されるようにしました。
  4. タブボタンとタブの中身の間の余白を "mt-6 md:mt-8" に増やし、
     窮屈な印象をなくしました。
*/
import React from 'react';
import { ThemeProvider } from "next-themes";
import { Toaster } from "@/components/ui/sonner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Users, Activity, HomeIcon } from "lucide-react";

// 3つのツールコンポーネントをインポートします
import GenogramTool from "./components/GenogramTool.jsx";
import BodyChartTool from "./components/BodyChartTool.jsx";
import HouseLayoutTool from "./components/HouseLayoutTool.jsx";

function App() {
  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
      <div className="flex flex-col min-h-screen bg-background text-foreground">
        
        {/* ヘッダー */}
        <header className="sticky top-0 z-50 w-full border-b backdrop-blur supports-[backdrop-filter]:bg-background/60">
          {/* ↓↓↓ (修正点 1) max-w-7xl に変更 */}
          <div className="container flex h-16 max-w-7xl items-center px-4 sm:px-6 lg:px-8">
            <div className="mr-4 flex">
              <a className="mr-6 flex items-center space-x-2" href="/">
                <span className="font-bold text-lg sm:inline-block">
                  介護アセスメントツール
                </span>
              </a>
            </div>
            {/* ここに将来的にナビゲーションメニューなどを追加できます */}
          </div>
        </header>

        {/* メインコンテンツ */}
        {/* ↓↓↓ (修正点 1 & 2) max-w-7xl に変更し、垂直方向の余白(py)を調整 */}
        <main className="flex-1 container max-w-7xl mx-auto py-6 md:py-10 px-4 md:px-8">
          
          <Tabs defaultValue="genogram" className="w-full">
            
            {/* タブのボタン部分 */}
            {/* ↓↓↓ (修正点 3) mx-auto を追加して中央寄せ */}
            <TabsList className="grid w-full grid-cols-3 md:w-[400px] mx-auto">
              <TabsTrigger value="genogram">
                <Users className="w-4 h-4 mr-2" />
                ジェノグラム
              </TabsTrigger>
              <TabsTrigger value="body">
                <Activity className="w-4 h-4 mr-2" />
                身体図
              </TabsTrigger>
              <TabsTrigger value="house">
                <HomeIcon className="w-4 h-4 mr-2" />
                家屋図
              </TabsTrigger>
            </TabsList>
            
            {/* ジェノグラムのコンテンツ */}
            {/* ↓↓↓ (修正点 4) タブとコンテンツの余白を増やす */}
            <TabsContent value="genogram" className="mt-6 md:mt-8">
              <GenogramTool />
            </TabsContent>
            
            {/* 身体図のコンテンツ */}
            {/* ↓↓↓ (修正点 4) タブとコンテンツの余白を増やす */}
            <TabsContent value="body" className="mt-6 md:mt-8">
              <BodyChartTool />
            </TabsContent>
            
            {/* 家屋図のコンテンツ */}
            {/* ↓↓↓ (修正点 4) タブとコンテンツの余白を増やす */}
            <TabsContent value="house" className="mt-6 md:mt-8">
              <HouseLayoutTool />
            </TabsContent>
            
          </Tabs>
        </main>
      </div>
      
      {/* 通知（トースト）コンポーネント */}
      <Toaster />
    </ThemeProvider>
  );
}
export default App;
