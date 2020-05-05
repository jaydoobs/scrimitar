import React from 'react';
import './App.scss';
import {
  BrowserRouter as Router,
  Switch,
  Route
} from "react-router-dom";
import StreamView from "./StreamView";
import CaptainView from "./CaptainView";
import HomeView from "./HomeView";

export default function App() {
  return (
      <Router>
          <Switch>
            <Route path="/stream">
              <StreamView />
            </Route>
            <Route path="/captain">
              <CaptainView />
            </Route>
            <Route path="/">
              <HomeView />
            </Route>
          </Switch>
      </Router>
  );
}