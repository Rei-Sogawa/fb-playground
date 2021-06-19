import { Link, Route, BrowserRouter as Router, Switch } from "react-router-dom";

import Todos from "./features/todos/Todos";
import Counter from "./features/counter/Counter";

const App = () => {
  return (
    <Router>
      <div style={{ width: "720px", margin: "0 auto" }}>
        <div style={{ display: "flex", marginBottom: "1rem" }}>
          <Link to="/todos" style={{ marginRight: ".5rem" }}>
            Todo
          </Link>
          <Link to="counter">Counter</Link>
        </div>

        <Switch>
          <Route path="/todos">
            <Todos />
          </Route>
          <Route path="/counter">
            <Counter />
          </Route>
        </Switch>
      </div>
    </Router>
  );
};

export default App;
