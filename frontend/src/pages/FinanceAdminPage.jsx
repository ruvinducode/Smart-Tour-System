import { useState } from 'react'
import FinanceDashboard from '../components/finance/FinanceDashboard.jsx'
import PricingManagement from '../components/finance/PricingManagement.jsx'
import CustomerPayments from '../components/finance/CustomerPayments.jsx'
import DriverPayments from '../components/finance/DriverPayments.jsx'
import IncomeManagement from '../components/finance/IncomeManagement.jsx'
import ExpenseManagement from '../components/finance/ExpenseManagement.jsx'
import RefundManagement from '../components/finance/RefundManagement.jsx'
import FinancialReports from '../components/finance/FinancialReports.jsx'

const FINANCE_NAV = [
  { id: 'dashboard', icon: 'bi-speedometer2', label: 'Dashboard' },
  { id: 'pricing', icon: 'bi-tags-fill', label: 'Pricing' },
  { id: 'customer_payments', icon: 'bi-credit-card-fill', label: 'Customer Payments' },
  { id: 'driver_payments', icon: 'bi-wallet-fill', label: 'Driver Payments' },
  { id: 'income', icon: 'bi-graph-up-arrow', label: 'Income' },
  { id: 'expenses', icon: 'bi-receipt-cutoff', label: 'Expenses' },
  { id: 'refunds', icon: 'bi-arrow-counterclockwise', label: 'Refunds' },
  { id: 'reports', icon: 'bi-file-earmark-bar-graph-fill', label: 'Reports' },
]

export default function FinanceAdminPage({ token }) {
  const [section, setSection] = useState('dashboard')

  const renderSection = () => {
    switch (section) {
      case 'dashboard': return <FinanceDashboard token={token} />
      case 'pricing': return <PricingManagement token={token} />
      case 'customer_payments': return <CustomerPayments token={token} />
      case 'driver_payments': return <DriverPayments token={token} />
      case 'income': return <IncomeManagement token={token} />
      case 'expenses': return <ExpenseManagement token={token} />
      case 'refunds': return <RefundManagement token={token} />
      case 'reports': return <FinancialReports token={token} />
      default: return <FinanceDashboard token={token} />
    }
  }

  return (
    <div className="flex flex-col lg:flex-row gap-8 font-['Plus_Jakarta_Sans',sans-serif]">
      <nav className="lg:w-64 shrink-0">
        <div className="rounded-[2rem] bg-white border border-slate-150 p-4 shadow-[0_8px_30px_rgba(15,23,42,0.04)] lg:sticky lg:top-6">
          <p className="px-3.5 pt-1 pb-3 text-[9px] font-black uppercase tracking-[0.25em] text-slate-400 border-b border-slate-100 mb-4">
            Finance Console
          </p>
          <div className="flex lg:flex-col gap-1.5 overflow-x-auto">
            {FINANCE_NAV.map((item) => {
              const active = section === item.id
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setSection(item.id)}
                  className={`group flex items-center rounded-2xl px-4 py-3 text-left text-[13px] font-bold tracking-wide whitespace-nowrap transition-all duration-300 active:scale-[0.98] cursor-pointer ${
                    active
                      ? 'bg-gradient-to-r from-[#1a2e6f] to-[#2a4db5] text-white shadow-[0_10px_20px_-5px_rgba(26,46,111,0.2)]'
                      : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900 hover:pl-5'
                  }`}
                >
                  <i
                    className={`bi ${item.icon} text-[15px] transition-colors duration-300 mr-3 ${
                      active ? 'text-white' : 'text-slate-400 group-hover:text-slate-600'
                    }`}
                  />
                  {item.label}
                </button>
              )
            })}
          </div>
        </div>
      </nav>
      <div className="flex-1 min-w-0">{renderSection()}</div>
    </div>
  )
}
