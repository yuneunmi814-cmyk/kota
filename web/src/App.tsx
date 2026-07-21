import { BrowserRouter, Route, Routes } from 'react-router-dom'
import { LangProvider } from './i18n'
import HomePage from './pages/HomePage'
import SearchPage from './pages/SearchPage'

export default function App() {
  return (
    <LangProvider>
      <BrowserRouter basename={import.meta.env.BASE_URL}>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/search" element={<SearchPage />} />
        </Routes>
      </BrowserRouter>
    </LangProvider>
  )
}
