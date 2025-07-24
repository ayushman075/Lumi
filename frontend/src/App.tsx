import { SignedIn, SignedOut } from "@clerk/clerk-react";
import { Talker } from "./components/Talker";
import { BrowserRouter, Route, Routes } from 'react-router-dom'
import { LandingPage } from "./components/LandingPage";




function App() {




  return (
 <><SignedOut>
      <LandingPage></LandingPage>
    </SignedOut>
    <SignedIn>
      <BrowserRouter>
        <Routes>
          <Route path='/' element={<Talker/>}/>
        </Routes>
      </BrowserRouter>
    </SignedIn>
      
    </>
  );
}

export default App;
