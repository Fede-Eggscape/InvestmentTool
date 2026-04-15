import { useState } from 'react'
import Header from './components/layout/Header'
import TabNav from './components/layout/TabNav'
import MarketDashboard from './components/layout/MarketDashboard'
import DualTable from './components/dual/DualTable'
import MeteoraTable from './components/meteora/MeteoraTable'

export default function App() {
  const [activeTab, setActiveTab] = useState('dual')

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col">
      <Header />
      <MarketDashboard />
      <TabNav active={activeTab} onChange={setActiveTab} />

      <main className="flex-1">
        {activeTab === 'dual' && <DualTable />}
        {activeTab === 'meteora' && <MeteoraTable />}
      </main>
    </div>
  )
}
