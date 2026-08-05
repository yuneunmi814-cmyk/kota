import { BrowserRouter, Route, Routes } from 'react-router-dom'
import { LangProvider } from './i18n'
import HomePage from './pages/HomePage'
import SearchPage from './pages/SearchPage'
import FestivalsPage from './pages/FestivalsPage'
import FestivalDetailPage from './pages/FestivalDetailPage'

export default function App() {
  return (
    <LangProvider>
      <BrowserRouter basename={import.meta.env.BASE_URL}>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/search" element={<SearchPage />} />
          <Route path="/festivals" element={<FestivalsPage />} />
          <Route path="/festivals/:id" element={<FestivalDetailPage />} />
        </Routes>
      </BrowserRouter>
    </LangProvider>
  )
}
