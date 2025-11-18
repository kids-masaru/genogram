/*
  src/App.jsx
  これがプロジェクトの「本体」となるコンポーネントです。
  
  主な役割:
  1. ThemeProvider: アプリ全体にテーマ（ライト/ダークモード）を提供します。
  2. Toaster: クリック時などに通知（トースト）を表示できるようにします。
  3. Tabs: 以前分析した3つのツールコンポーネントをタブで切り替えて表示します。
*/
import React, { useState } from 'react';
import { ThemeProvider } from "next-themes"; // package.json に含まれていました
import { Toaster } from "@/components/ui/sonner"; // package.json に含まれていました
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Users, Activity, HomeIcon } from "lucide-react"; // アイコン

// 3つのツールコンポーネントをインポートします
// ファイルが src/components/ の直下にあるため、相対パスで指定します。
import GenogramTool from "./components/GenogramTool.jsx";
import BodyChartTool from "./components/BodyChartTool.jsx";
import HouseLayoutTool from "./components/HouseLayoutTool.jsx";

function App() {
  return (
    // 1. テーマプロバイダーでアプリ全体をラップします
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
      <div className="flex flex-col min-h-screen">
        
        {/* ヘッダー */}
        <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
          <div className="container flex h-14 max-w-screen-2xl items-center">
            <div className="mr-4 flex">
              <a className="mr-6 flex items-center space-x-2" href="/">
                {/* ロゴやアイコンをここに追加できます */}
                <span className="font-bold sm:inline-block">
                  介護アセスメントツール
                </span>
              </a>
            </div>
            {/* ここに将来的にナビゲーションメニューなどを追加できます */}
          </div>
        </header>

        {/* メインコンテンツ */}
        <main className="flex-1 container max-w-screen-2xl mx-auto p-4 md:p-8">
          
          {/* 3. タブコンポーネントで3つのツールを切り替えます */}
          <Tabs defaultValue="genogram" className="w-full">
            
            {/* タブのボタン部分 */}
            <TabsList className="grid w-full grid-cols-3 md:w-[400px]">
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
            <TabsContent value="genogram" className="mt-4">
              {/* ここでツールコンポーネントを呼び出します */}
              <GenogramTool />
            </TabsContent>
            
            {/* 身体図のコンテンツ */}
            <TabsContent value="body" className="mt-4">
              <BodyChartTool />
            </TabsContent>
            
            {/* 家屋図のコンテンツ */}
            <TabsContent value="house" className="mt-4">
              <HouseLayoutTool />
            </TabsContent>
            
          </Tabs>
        </main>
      </div>
      
      {/* 2. 通知（トースト）コンポーネントを配置します */}
      <Toaster />
    </ThemeProvider>
  );
}

export default App;
