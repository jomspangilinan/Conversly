import { BrowserRouter, Routes, Route } from 'react-router-dom'
import UploadPage from './views/UploadPage'
import VideoReviewPage from './views/VideoReviewPage'
import StudentWatchPage from './views/StudentWatchPage'
import SignInPage from './views/SignInPage'
import StudentHomePage from './views/StudentHomePage'
import CreatorHomePage from './views/CreatorHomePage'
import { AuthProvider } from './auth/AuthContext'
import { ApiKeysProvider } from './contexts/ApiKeysContext'
import { RequireRole } from './components/auth/RequireRole'

function App() {
  return (
    <AuthProvider>
      <ApiKeysProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<SignInPage />} />
            <Route path="/signin" element={<SignInPage />} />

            <Route
              path="/student"
              element={
                <RequireRole role="student">
                  <StudentHomePage />
                </RequireRole>
              }
            />
            <Route
              path="/student/watch/:id"
              element={
                <RequireRole role="student">
                  <StudentWatchPage />
                </RequireRole>
              }
            />

            <Route
              path="/creator"
              element={
                <RequireRole role="creator">
                  <CreatorHomePage />
                </RequireRole>
              }
            />
            <Route
              path="/creator/upload"
              element={
                <RequireRole role="creator">
                  <UploadPage />
                </RequireRole>
              }
            />
            <Route
              path="/creator/videos/:id"
              element={
                <RequireRole role="creator">
                  <VideoReviewPage />
                </RequireRole>
              }
            />

            {/* Back-compat routes (optional) */}
            <Route path="/videos/:id" element={<VideoReviewPage />} />
            <Route path="/watch/:id" element={<StudentWatchPage />} />
            <Route path="/upload" element={<UploadPage />} />
          </Routes>
        </BrowserRouter>
      </ApiKeysProvider>
    </AuthProvider>
  )
}

export default App


