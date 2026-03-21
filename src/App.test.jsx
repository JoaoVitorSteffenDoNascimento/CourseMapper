// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import App from './App'

function createJsonResponse(data, { status = 200 } = {}) {
  return {
    ok: status >= 200 && status < 300,
    status,
    headers: {
      get(name) {
        return name.toLowerCase() === 'content-type' ? 'application/json' : null
      },
    },
    async json() {
      return data
    },
    async text() {
      return JSON.stringify(data)
    },
  }
}

function createMapData(overrides = {}) {
  return {
    course: { id: 'cc', code: 'CC', name: 'Ciencia da Computacao', trailLabels: ['Base', 'Sistemas'] },
    stats: {
      totalSubjects: 2,
      completedCount: 1,
      availableCount: 1,
      lockedCount: 0,
      completionRate: 50,
      remainingCriticalSemesters: 2,
    },
    subjects: [
      {
        id: 'CC101',
        name: 'Algoritmos',
        trail: 'Base',
        semester: 1,
        prerequisites: [],
        corequisites: [],
        status: 'completed',
        isCritical: true,
      },
      {
        id: 'CC102',
        name: 'Estruturas de Dados',
        trail: 'Sistemas',
        semester: 2,
        prerequisites: ['CC101'],
        corequisites: [],
        status: 'available',
        isCritical: true,
      },
    ],
    ...overrides,
  }
}

function createFetchMock() {
  const state = {
    user: {
      id: 'user-1',
      name: 'Lucas Oliveira',
      username: 'lucas',
      registration: '2026000001',
      email: 'lucas@universidade.edu.br',
      courseId: 'cc',
      avatarUrl: '',
      preferences: { theme: 'brand' },
    },
    mapData: createMapData(),
  }

  const mock = vi.fn(async (input, options = {}) => {
    const url = String(input)
    const method = options.method || 'GET'

    if (url.endsWith('/api/curriculums')) {
      return createJsonResponse([
        { id: 'cc', name: 'Ciencia da Computacao' },
        { id: 'si', name: 'Sistemas de Informacao' },
      ])
    }

    if (url.endsWith('/api/auth/register') && method === 'POST') {
      return createJsonResponse({
        token: 'secure-token',
        user: state.user,
      }, { status: 201 })
    }

    if (url.endsWith('/api/auth/me')) {
      return createJsonResponse({ user: state.user })
    }

    if (url.includes('/api/map?courseId=cc')) {
      return createJsonResponse(state.mapData)
    }

    if (url.endsWith('/api/profile') && method === 'PATCH') {
      const payload = JSON.parse(options.body)
      state.user = {
        ...state.user,
        name: payload.name,
        username: payload.username,
        email: payload.email,
        avatarUrl: payload.avatarUrl,
        preferences: { theme: payload.theme },
      }
      return createJsonResponse({ user: state.user })
    }

    if (url.endsWith('/api/progress/toggle') && method === 'POST') {
      const payload = JSON.parse(options.body)
      state.mapData = {
        ...state.mapData,
        stats: {
          ...state.mapData.stats,
          completedCount: payload.completed ? 2 : 1,
          availableCount: payload.completed ? 0 : 1,
          completionRate: payload.completed ? 100 : 50,
        },
        subjects: state.mapData.subjects.map((subject) => (
          subject.id === payload.subjectId
            ? { ...subject, status: payload.completed ? 'completed' : 'available' }
            : subject
        )),
      }
      return createJsonResponse(state.mapData)
    }

    if (url.endsWith('/api/auth/logout') && method === 'POST') {
      return createJsonResponse(null, { status: 204 })
    }

    throw new Error(`Rota nao mockada no teste: ${url}`)
  })

  return mock
}

function changeField(label, value) {
  fireEvent.change(screen.getByLabelText(label), { target: { value } })
}

async function openRegisterForm() {
  fireEvent.click(await screen.findByRole('button', { name: 'Cadastrar-se' }))
}

function fillRegisterForm({
  name = 'Lucas Oliveira',
  registration = '2026000001',
  email = 'lucas@universidade.edu.br',
  password = 'Senhaforte1!',
  courseId = 'cc',
} = {}) {
  changeField('Nome completo', name)
  changeField('Matricula', registration)
  changeField('E-mail', email)
  changeField('Senha', password)
  fireEvent.change(screen.getByLabelText('Curso'), { target: { value: courseId } })
}

async function renderAuthenticatedApp() {
  window.localStorage.setItem('coursemapper_token', 'secure-token')
  render(<App />)
  await screen.findByText('Bom ver voce por aqui, Lucas.')
}

describe('App', () => {
  beforeEach(() => {
    window.localStorage.clear()
    vi.stubGlobal('fetch', createFetchMock())
  })

  afterEach(() => {
    cleanup()
    vi.unstubAllGlobals()
  })

  it('bloqueia cadastro com senha fraca antes de chamar a API', async () => {
    render(<App />)

    await openRegisterForm()
    fillRegisterForm({ password: 'fraca123' })
    fireEvent.click(screen.getByRole('button', { name: 'Cadastrar-se' }))

    expect(await screen.findByText('A senha deve incluir pelo menos uma letra maiuscula.')).toBeInTheDocument()
    expect(fetch).toHaveBeenCalledTimes(1)
  })

  it('bloqueia cadastro com e-mail invalido no frontend', async () => {
    render(<App />)

    await openRegisterForm()
    fillRegisterForm({ email: 'lucas@localhost' })
    fireEvent.click(screen.getByRole('button', { name: 'Cadastrar-se' }))

    expect(await screen.findByText('Informe um e-mail valido.')).toBeInTheDocument()
    expect(fetch).toHaveBeenCalledTimes(1)
  })

  it('envia cadastro apenas com credenciais fortes e dados normalizados', async () => {
    render(<App />)

    await openRegisterForm()
    fillRegisterForm({
      registration: '2026-000001',
      email: '  Lucas@Universidade.edu.br ',
    })
    fireEvent.click(screen.getByRole('button', { name: 'Cadastrar-se' }))

    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith(
        '/api/auth/register',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({
            name: 'Lucas Oliveira',
            registration: '2026000001',
            email: 'lucas@universidade.edu.br',
            password: 'Senhaforte1!',
            courseId: 'cc',
          }),
        }),
      )
    })

    expect(await screen.findByText('Bom ver voce por aqui, Lucas.')).toBeInTheDocument()
  })

  it('carrega a sessao autenticada e exibe metricas do dashboard', async () => {
    await renderAuthenticatedApp()

    expect(screen.getByText('50%')).toBeInTheDocument()
    expect(screen.getAllByText('Estruturas de Dados').length).toBeGreaterThan(0)
    expect(screen.getByText('Semestres restantes')).toBeInTheDocument()
  })

  it('permite salvar configuracoes de perfil com dados normalizados', async () => {
    await renderAuthenticatedApp()

    fireEvent.click(screen.getByRole('button', { name: 'Configuracoes' }))
    await screen.findByText('Seu perfil e preferencias')

    changeField('Nome completo', 'Lucas Seguro')
    changeField('Nome de usuario', 'lucasdev')
    changeField('E-mail', '  LUCAS@Universidade.edu.br ')
    fireEvent.click(screen.getByRole('button', { name: 'Dark' }))
    fireEvent.click(screen.getByRole('button', { name: 'Salvar configuracoes' }))

    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith(
        '/api/profile',
        expect.objectContaining({
          method: 'PATCH',
          body: JSON.stringify({
            name: 'Lucas Seguro',
            username: 'lucasdev',
            email: 'lucas@universidade.edu.br',
            avatarUrl: '',
            theme: 'dark',
          }),
        }),
      )
    })

    expect(await screen.findByText('Configuracoes salvas com sucesso.')).toBeInTheDocument()
  })

  it('permite marcar disciplina disponivel como concluida no curriculo', async () => {
    await renderAuthenticatedApp()

    fireEvent.click(screen.getByRole('button', { name: 'Curriculo' }))
    await screen.findByText('Estruturas de Dados')
    fireEvent.click(screen.getByRole('button', { name: /CC102/i }))

    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith(
        '/api/progress/toggle',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({
            courseId: 'cc',
            subjectId: 'CC102',
            completed: true,
          }),
        }),
      )
    })

    expect(await screen.findAllByText('Concluida')).not.toHaveLength(0)
  })
})
