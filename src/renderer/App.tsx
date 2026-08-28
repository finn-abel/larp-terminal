import { Titlebar } from './components/titlebar/Titlebar'
import './app.css'

/** Modules land here in Steps 2-6; for now the shell reports an empty workspace. */
const BOOT_LINES: readonly string[] = [
  'shell        ready',
  'engine       not mounted   [step 2]',
  'panel host   not mounted   [step 3]',
  'feeds        none'
]

export function App(): React.JSX.Element {
  return (
    <div className="app">
      <Titlebar />
      <main className="workspace" aria-label="Workspace">
        <section className="boot" aria-labelledby="boot-heading">
          <h1 id="boot-heading" className="boot__heading">
            WORKSPACE EMPTY
          </h1>
          <ul className="boot__list">
            {BOOT_LINES.map((line) => (
              <li key={line} className="boot__line">
                {line}
              </li>
            ))}
          </ul>
          <p className="boot__note">
            All data in this application is procedurally generated and fake.
          </p>
        </section>
      </main>
    </div>
  )
}
