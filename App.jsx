import React, { useState } from "react";

function App() {
  const [file, setFile] = useState(null);

  return (
    <div className="app">
      <h1>Power Up Your Docs</h1>
      <form>
        <input type="file" onChange={(e) => setFile(e.target.files[0])} />
        <input type="text" name="source" placeholder="Source" />
        <input type="text" name="medium" placeholder="Medium" />
        <input type="text" name="campaign" placeholder="Campaign" />
        <select name="job_type">
          <option value="utm_only">Add UTM Only</option>
          <option value="link_and_utm">Add Links and UTM</option>
        </select>
        <input type="text" name="target_format" placeholder="Target Format" />
        <input type="text" name="base_url" placeholder="https://yourcompany.com/store/" />
        <button type="submit">Process PDF</button>
      </form>
    </div>
  );
}

export default App;
