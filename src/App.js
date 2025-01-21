import React, { useState, useEffect } from "react";
import Login from './Login';
import RadarChart from "./RadarChart";
import ReactSlider from "react-slider";
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import LoginPage from './LoginPage';
import { jsPDF } from "jspdf";
import "jspdf-autotable";

import "./index.css";

function App() {
  const [ageRange, setAgeRange] = useState([0, 100]); // Default range (e.g., 0-100)
  const [loggedIn, setLoggedIn] = useState(false); 

  const [matchRange, setMatchRange] = useState([0, 100]);
  const [uniqueMatch, setUniqueMatch] = useState([]); 

  const [minuteRange, setMinuteRange] = useState([0, 100]);
  const [uniqueMinute, setUniqueMinute] = useState([]); 


  const [selectedPlayer, setSelectedPlayer] = useState(null); // State for selected player

  const [file, setFile] = useState(null);
  const [results, setResults] = useState([]);
  const [filteredResults, setFilteredResults] = useState([]);
  const [searchQuery, setSearchQuery] = useState(""); // New state for search bar

  const [uniqueCountries, setUniqueCountries] = useState([]); // For country dropdown
  const [uniqueYears, setUniqueYears] = useState([]); // For year dropdown
  const [uniqueAge, setUniqueAge] = useState([]); // For Age dropdown 
  const [uniqueClub, setUniqueClub] = useState([]); // For Club dropdown
  const [uniquePosizione, setUniquePosizione] = useState([]); // For Posizione dropdown
  const [uniqueParentPosizione, setUniqueParentPosizione] = useState([]); // For Parent Posizione dropdown
  
  const [selectedCountry, setSelectedCountry] = useState(""); // Selected country
  const [selectedYear, setSelectedYear] = useState(""); // Selected year
  const [selectedAge, setSelectedAge] = useState(""); // Selected Age
  const [selectedClub, setSelectedClub] = useState(""); // Selected Club
  const [selectedPosizione, setSelectedPosizione] = useState(""); // Selected Posizione
  const [selectedParentPosizione, setSelectedParentPosizione] = useState(""); // Selected Parent Posizione

  const [selectedMatches, setSelectedMatches] = useState(0); // Default to 0 for "All"
  const [selectedMinutes, setSelectedMinutes] = useState(0); // Default to 0 for "All"

  

  const [message, setMessage] = useState("");
  
  const [weights, setWeights] = useState({
    attacking_weight: 0.1,
    defensive_weight: 0.1,
    passing_weight: 0.1,
    dribbling_weight: 0.7,
  });

  
  // const [filters, setFilters] = useState({
  //   ageMin: "",
  //   ageMax: "",
  //   foot: "",
  //   heightMin: "",
  //   heightMax: "",
  //   weightMin: "",
  //   weightMax: "",
  //   teamWithinParameters: "",
  // });
  // Handle logout
  const handleLogout = () => {
    localStorage.removeItem("loggedIn"); // Remove login state
    setLoggedIn(false); // Update state
    window.location.reload(); // Refresh the page to reset the app
  };



  const uploadFile = async () => {
    if (!file) {
      alert("Please select a file before uploading.");
      return;
    }

    const formData = new FormData();
    formData.append("file", file);

    try {
      const response = await fetch("http://127.0.0.1:5000/upload", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        setMessage(`Error: ${errorData.error || "Failed to upload file"}`);
        return;
      }

      const data = await response.json();
      console.log(data);
      setMessage(data.message || "File uploaded successfully!");
    } catch (error) {
      console.error("Error uploading file:", error);
      setMessage("An error occurred while uploading the file.");
    }
  };

  const processFile = async () => {
    // Calculate remaining weight
    const totalWeight = Object.values(weights).reduce((sum, w) => sum + w, 0);
    const remainingWeight = 1 - totalWeight;
  
    // Check if the remaining weight is zero
    if (remainingWeight !== 0) {
      alert(`Please adjust the weights so that the remaining weight is exactly 0. Current remaining weight: ${remainingWeight.toFixed(2)}`);
      return; // Stop further processing
    }
  
    try {
      const response = await fetch("http://127.0.0.1:5000/process", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(weights),
      });
  
      if (!response.ok) {
        const errorData = await response.json();
        setMessage(`Error: ${errorData.error || "Failed to process file"}`);
        return;
      }
  
      const data = await response.json();
      setResults(data);
      setFilteredResults(data);
      extractUniqueCountriesAndYears(data);
      extractUniqueAge(data);
      extractUniqueMatch(data);
      extractUniqueMinute(data);

      extractUniqueClub(data);
      extractUniquePosizione(data);
      extractUniqueCombinedPosizione(data);
      extractUniqueParentPosizione(data);
      extractUniqueRanges(data);
  
      setMessage("File processed successfully!");
    } catch (error) {
      console.error("Error processing file:", error);
      setMessage("An error occurred while processing the file.");
    }
  };

  


  const [sortConfig, setSortConfig] = useState({ key: "", direction: "asc" });

  const handleSort = (columnKey) => {
    let direction = "asc";
    if (sortConfig.key === columnKey && sortConfig.direction === "asc") {
      direction = "desc";
    }
    setSortConfig({ key: columnKey, direction });
  
    const sortedData = [...filteredResults].sort((a, b) => {
      if (a[columnKey] < b[columnKey]) {
        return direction === "asc" ? -1 : 1;
      }
      if (a[columnKey] > b[columnKey]) {
        return direction === "asc" ? 1 : -1;
      }
      return 0;
    });
  
    setFilteredResults(sortedData);
  };

  // Function to generate and download the PDF
  const downloadPDF = () => {
    const doc = new jsPDF();

    // Define the column headers
    const tableColumnHeaders = [
      "Player Name", "Team Name", "Parent Posizione", "Posizione", "Age", 
      "Height", "Weight", "Country", "Matches Played", "Minutes Played", "Weighted Score"
    ];

    // Map filteredResults to rows for the table
    const tableRows = filteredResults.map((player) => [
      player["Player Name"] || "N/A",
      player["Team Name"] || "N/A",
      player["Parent Posizione"] || "N/A",
      player["Posizione"] || "N/A",
      player["Age"] || "N/A",
      player["Height"] || "N/A",
      player["Weight"] || "N/A",
      player["Country"] || "N/A",
      player["Partite disputate"] || "N/A",
      player["Minuti giocati"] || "N/A",
      player["Weighted Score"] !== undefined ? player["Weighted Score"].toFixed(2) : "N/A",
    ]);

    // Add title to the PDF
    doc.text("Filtered Data Report", 14, 15);

    // Add the table to the PDF
    doc.autoTable({
      startY: 20,
      head: [tableColumnHeaders],
      body: tableRows,
      styles: {
        fillColor: [255, 255, 255], // White background for all cells
        textColor: [0, 0, 0], // Black text color
      },
      headStyles: {
        fillColor: [21, 83, 19], // Light grey background for headers
        textColor: [255, 255, 255], // Black text color for headers
        fontStyle: "bold",
      },
      alternateRowStyles: {
        fillColor: [245, 245, 245], // Slightly different color for alternate rows
      },
    });

    // Save the PDF file
    doc.save("Filtered_Data_Report.pdf");
  };
  


  const extractUniqueCombinedPosizione = (data) => {
    // Extract all 'Posizione' values
    const allPositions = data.map((player) => player.Posizione).filter((pos) => pos);

    let uniqueIndividualPositions = new Set();
    let combinedPositions = new Set();

    allPositions.forEach((position) => {
        const separatedPositions = position.split(",").map((pos) => pos.trim());

        if (separatedPositions.length > 1) {
            combinedPositions.add(position); // Add the original combined position
        }

        // Add individual positions
        separatedPositions.forEach((pos) => uniqueIndividualPositions.add(pos));
    });

    // Convert sets to sorted arrays
    const uniqueIndividualPositionsList = Array.from(uniqueIndividualPositions).sort();
    const combinedPositionsList = Array.from(combinedPositions).sort();

    // Merge individual and combined positions
    const allUniquePositions = [...uniqueIndividualPositionsList, ...combinedPositionsList];

    // Update the dropdown
    setUniquePosizione(allUniquePositions);

    console.log("Unique Individual Positions:", uniqueIndividualPositionsList);
    console.log("Combined Positions:", combinedPositionsList);
  };

  // Extract unique countries and years from the results
  const extractUniqueCountriesAndYears = (data) => {
    const countries = [...new Set(data.map((player) => player["Country"] || "Unknown"))].sort();
    const years = [...new Set(data.map((player) => player["Year"] || "Unknown"))].sort();
    setUniqueCountries(countries);
    setUniqueYears(years);
  };
  const extractUniqueAge = (data) => {
    const age = [...new Set(data.map((player) => player["Age"] || 0))].sort((a, b) => a - b);
    setUniqueAge(age);
    if (age.length > 0) {
      setAgeRange([age[0], age[age.length - 1]]); // Set min and max dynamically
    }
  }


  const extractUniqueMatch = (data) => {
    const match = [...new Set(data.map((player) => player["Partite disputate"] || 0))].sort((a, b) => a - b);
    setUniqueMatch(match);
    if (match.length > 0) {
      setMatchRange([match[0], match[match.length - 1]]); // Set min and max dynamically
    }
  }

  const extractUniqueMinute = (data) => {
    const minute = [...new Set(data.map((player) => player["Minuti giocati"] || 0))].sort((a, b) => a - b);
    setUniqueMinute(minute);
    if (minute.length > 0) {
      setMinuteRange([minute[0], minute[minute.length - 1]]); // Set min and max dynamically
    }
  }


  const extractUniqueClub = (data) => {
    const club = [...new Set(data.map((player) => player["Team Name"] || "Unknown"))].sort();
    setUniqueClub(club);
  }

  const extractUniquePosizione = (data) => {
    const posizione = [...new Set(data.map((player) => player["combinedPositions"] || "Unknown"))];
    setUniquePosizione(posizione);
  }

  const extractUniqueParentPosizione = (data) => {
    const parentPosizione = [...new Set(data.map((player) => player["Parent Posizione"] || "Unknown"))].sort();
    setUniqueParentPosizione(parentPosizione);
  }

  const extractUniqueRanges = (data) => {
    const matchesRange = [Math.min(...data.map(player => player["Partite disputate"] || 0)), Math.max(...data.map(player => player["Partite disputate"] || 0))];
    const minutesRange = [Math.min(...data.map(player => player["Minuti giocati"] || 0)), Math.max(...data.map(player => player["Minuti giocati"] || 0))];
  
    setSelectedMatches(matchesRange[0]); // Default to the maximum value
    setSelectedMinutes(minutesRange[0]); // Default to the maximum value
  };



  // Handle dropdown selection for country filtering
  const handleCountryChange = (event) => {
    const selected = event.target.value;
    setSelectedCountry(selected);

  };


  // Handle dropdown selection for year filtering
  const handleYearChange = (event) => {
    const selected = event.target.value;
    setSelectedYear(selected);
  };
  
  const handleAgeChange = (value) => {
    if (value === "All" || value === 0) {
      setSelectedAge("All");
    } else {
      setSelectedAge(parseInt(value));
    }
  };
  
  

  const handleClubChange = (event) => {
    const selected = event.target.value;
    setSelectedClub(selected);
  };

  const handlePosizioneChange = (event) => {
    const selected = event.target.value;
    setSelectedPosizione(selected);
  };

  const handleParentPosizioneChange = (event) => {
    const selected = event.target.value;
    setSelectedParentPosizione(selected);
  };

  
  const handlePlayerClick = (player) => {
    console.log("Player clicked:", player);
  
    if (selectedPlayer && selectedPlayer.playerName === player["Player Name"]) {
      setSelectedPlayer(null); // Hide the radar chart if the same player is clicked again
    } else {
      const parentPosition = player["Parent Posizione"];
      if (!parentPosition) {
        console.error("Parent Position is undefined for the selected player.");
        return;
      }
  
      // Filter data based on Parent Posizione
      const filteredDataForRadar = results.filter(
        (p) => p["Parent Posizione"] === parentPosition
      );
  
      // Updated formatted player data
      const formattedPlayerData = {
        playerName: player["Player Name"] || "Unknown Player",
  
        // Defensive Phase Percentiles
        "Azione difensive riuscite/90 Percentile": player["Azione difensive riuscite/90 Percentile"] || 0,
        "Duelli difensivi/90 Percentile": player["Duelli difensivi/90 Percentile"] || 0,
        "Duelli difensivi vinti, % Percentile": player["Duelli difensivi vinti, % Percentile"] || 0,
        "Duelli aerei/90 Percentile": player["Duelli aerei/90 Percentile"] || 0,
        "Duelli aerei vinti, % Percentile": player["Duelli aerei vinti, % Percentile"] || 0,
        "Contrasti/90 Percentile": player["Contrasti/90 Percentile"] || 0,
        "Possesso riconquistato dopo tackle scivolato Percentile": player["Possesso riconquistato dopo tackle scivolato Percentile"] || 0,
        "Tiri intercettati/90 Percentile": player["Tiri intercettati/90 Percentile"] || 0,
        "Palle intercettate/90 Percentile": player["Palle intercettate/90 Percentile"] || 0,
        // "Possesso riconquistato dopo intercetto Percentile": player["Possesso riconquistato dopo intercetto Percentile"] || 0,
        // "Falli/90 Percentile": player["Falli/90 Percentile"] || 0,
        // "Cartellini gialli Percentile": player["Cartellini gialli Percentile"] || 0,
        // "Cartellini gialli/90 Percentile": player["Cartellini gialli/90 Percentile"] || 0,
        // "Cartellini rossi Percentile": player["Cartellini rossi Percentile"] || 0,
        // "Cartellini rossi/90 Percentile": player["Cartellini rossi/90 Percentile"] || 0,
  
        // Offensive Phase Percentiles
        "Azioni offensive riuscite/90 Percentile": player["Azioni offensive riuscite/90 Percentile"] || 0,
        "Goal Percentile": player["Goal Percentile"] || 0,
        "Goal/90 Percentile": player["Goal/90 Percentile"] || 0,
        "Goal (esclusi rigori) Percentile": player["Goal (esclusi rigori) Percentile"] || 0,
        "Goal esclusi rigori/90 Percentile": player["Goal esclusi rigori/90 Percentile"] || 0,
        "xG Percentile": player["xG Percentile"] || 0,
        "xG/90 Percentile": player["xG/90 Percentile"] || 0,
        "Goal di testa Percentile": player["Goal di testa Percentile"] || 0,
        "Goal di testa/90 Percentile": player["Goal di testa/90 Percentile"] || 0,
        "Tiri Percentile": player["Tiri Percentile"] || 0,
        "Tiri/90 Percentile": player["Tiri/90 Percentile"] || 0,
        "Tiri in porta, % Percentile": player["Tiri in porta, % Percentile"] || 0,
        // "Realizzazione, % Percentile": player["Realizzazione, % Percentile"] || 0,
        // "Assist Percentile": player["Assist Percentile"] || 0,
        // "Assist/90 Percentile": player["Assist/90 Percentile"] || 0,
        // "Cross/90 Percentile": player["Cross/90 Percentile"] || 0,
        // "Precisione cross, % Percentile": player["Precisione cross, % Percentile"] || 0,
        // "Cross dalla fascia sinistra/90 Percentile": player["Cross dalla fascia sinistra/90 Percentile"] || 0,
        // "Cross precisi da sinistra, % Percentile": player["Cross precisi da sinistra, % Percentile"] || 0,
        // "Cross dalla fascia destra/90 Percentile": player["Cross dalla fascia destra/90 Percentile"] || 0,
        // "Cross precisi da destra, % Percentile": player["Cross precisi da destra, % Percentile"] || 0,
        // "Cross verso l'area piccola/90 Percentile": player["Cross verso l'area piccola/90 Percentile"] || 0,
        // "Duelli offensivi/90 Percentile": player["Duelli offensivi/90 Percentile"] || 0,
        // "Duelli offensivi vinti, % Percentile": player["Duelli offensivi vinti, % Percentile"] || 0,
        // "Tocchi in area/90 Percentile": player["Tocchi in area/90 Percentile"] || 0,
  
        // Build-Up Phase Percentiles
        "Passaggi in avanti/90 Percentile": player["Passaggi in avanti/90 Percentile"] || 0,
        "Precisione passaggi in avanti, % Percentile": player["Precisione passaggi in avanti, % Percentile"] || 0,
        "Passaggi corti / medi /90 Percentile": player["Passaggi corti / medi /90 Percentile"] || 0,
        "Precisione passaggi corti / medi, % Percentile": player["Precisione passaggi corti / medi, % Percentile"] || 0,
        "Passaggi lunghi/90 Percentile": player["Passaggi lunghi/90 Percentile"] || 0,
        "Precisione lanci lunghi, % Percentile": player["Precisione lanci lunghi, % Percentile"] || 0,
  
        // Refinement Phase Percentiles
        "Passaggi chiave/90 Percentile": player["Passaggi chiave/90 Percentile"] || 0,
        "xA/90 Percentile": player["xA/90 Percentile"] || 0,
        "Second assist/90 Percentile": player["Second assist/90 Percentile"] || 0,
  
        filteredData: filteredDataForRadar,
      };
  
      setSelectedPlayer(formattedPlayerData); // Set the player data
    }
  };
  
  
  
  
  
  

  
  
  

  useEffect(() => {
    const storedLoginStatus = localStorage.getItem("loggedIn") === "true";
    setLoggedIn(storedLoginStatus);
      filterResults(); // Automatically filter whenever selectedCountry or selectedYear changes
  }, [selectedCountry, selectedYear, selectedAge, selectedClub, selectedPosizione, selectedParentPosizione, selectedPlayer,   selectedMatches, selectedMinutes, ageRange, matchRange, minuteRange]);

  const remainingWeight = 1 - Object.values(weights).reduce((sum, w) => sum + w, 0);


  const filterResults = () => {
    let filtered = results;

    // Filter by Age Range
    filtered = filtered.filter(
      (player) =>
        player["Age"] >= ageRange[0] && player["Age"] <= ageRange[1]
    );

    filtered = filtered.filter(
      (player) =>
        player["Partite disputate"] >= matchRange[0] && player["Partite disputate"] <= matchRange[1]
    );

    filtered = filtered.filter(
      (player) =>
        player["Minuti giocati"] >= minuteRange[0] && player["Minuti giocati"] <= minuteRange[1]
    );

    if (selectedCountry && selectedCountry !== "All") {
        filtered = filtered.filter((player) => player["Country"] === selectedCountry);
    }

    if (selectedYear && selectedYear !== "All") {
        filtered = filtered.filter((player) => player["Year"] === Number(selectedYear));
    }

    if (selectedAge && selectedAge !== "All") {
      filtered = filtered.filter((player) => player["Age"] === Number(selectedAge));
    }

    if (selectedClub && selectedClub !== "All") {
      filtered = filtered.filter((player) => player["Team Name"] === (selectedClub));
    }

    if (selectedPosizione && selectedPosizione !== "All") {
      filtered = filtered.filter((player) => {
        const positions = player["Posizione"]?.split(",").map((pos) => pos.trim());
        // Check if the selected position matches either an individual or a full combined position
        return (
          positions && 
          (positions.includes(selectedPosizione) || player["Posizione"] === selectedPosizione)
        );
      });
    }
    

    if (selectedParentPosizione && selectedParentPosizione !== "All") {
      filtered = filtered.filter((player) => player["Parent Posizione"] === (selectedParentPosizione));
    }

    if (selectedMatches > 0) {
      filtered = filtered.filter((player) => player["Partite disputate"] >= selectedMatches);
    }
  
    if (selectedMinutes > 0) {
      filtered = filtered.filter((player) => player["Minuti giocati"] >= selectedMinutes);
    }

    
    setFilteredResults(filtered);
  };

  
  // Function to handle search queries
  const handleSearch = (event) => {
    const query = event.target.value.toLowerCase();
    setSearchQuery(query);

    const filtered = results.filter((player) => {
      return (
        player["Player Name"]?.toLowerCase().includes(query) ||
        player["Team Name"]?.toLowerCase().includes(query)
      );
    });

    setFilteredResults(filtered);
  };

  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setFilters((prevFilters) => ({
      ...prevFilters,
      [name]: value,
    }));
  };

  const handleWeightChange = (e) => {
    const { name, value } = e.target;
    const updatedWeights = {
      ...weights,
      [name]: parseFloat(value) || 0,
    };
  
    // Calculate the total sum of weights
    const totalWeight = Object.values(updatedWeights).reduce((sum, w) => sum + w, 0);
  
    if (totalWeight > 1) {
      alert("The total sum of weights cannot exceed 1.");
      return;
    }
  
    // Update the weights only if valid
    setWeights(updatedWeights);
  };


  
  return (
    // <Router>
      <div className="App">

        
        <div className="left_div">
          <div className="title">
            <h1 onClick={() => window.location.reload()}>Data Scouting Algorithm</h1>
          </div>

          <div className="filter-container">

              {/* Country Dropdown */}
              <div className="filter-item">
                <label htmlFor="countryDropdown">Country:</label>
                <select
                  id="countryDropdown"
                  value={selectedCountry}
                  onChange={handleCountryChange}
                >
                  <option value="All">All</option>
                  {uniqueCountries.map((country, index) => (
                    <option key={index} value={country}>
                      {country}
                    </option>
                  ))}
                </select>
              </div>




              {/* Club Dropdown */}
              <div className="filter-item">
                <label htmlFor="clubDropdown">Club:</label>
                <select
                  id="clubDropdown"
                  value={selectedClub}
                  onChange={handleClubChange}
                >
                  <option value="All">All</option>
                  {uniqueClub.map((club, index) => (
                    <option key={index} value={club}>
                      {club}
                    </option>
                  ))}
                </select>
              </div>

              {/* Posizione Dropdown */}
              <div className="filter-item">
                <label htmlFor="posizioneDropdown">Posizione:</label>
                <select
                  id="posizioneDropdown"
                  value={selectedPosizione}
                  onChange={handlePosizioneChange}
                >
                  <option value="All">All</option>
                  {uniquePosizione.map((posizione, index) => (
                    <option key={index} value={posizione}>
                      {posizione}
                    </option>
                  ))}
                </select>
              </div>

              {/* Parent Posizione Dropdown */}
              <div className="filter-item">
                <label htmlFor="parentPosizioneDropdown">Parent Posizione:</label>
                <select
                  id="parentPosizioneDropdown"
                  value={selectedParentPosizione}
                  onChange={handleParentPosizioneChange}
                >
                  <option value="All">All</option>
                  {uniqueParentPosizione.map((parentPosizione, index) => (
                    <option key={index} value={parentPosizione}>
                      {parentPosizione}
                    </option>
                  ))}
                </select>
              </div>


              
              {/* Age Range */}
              <div className="filter-item">
                <label htmlFor="ageRange">Age Range:</label>
                <ReactSlider
                    className="horizontal-slider"
                    thumbClassName="thumb"
                    trackClassName="track"
                    min={uniqueAge[0] || 0} 
                    max={uniqueAge[uniqueAge.length - 1] || 100}
                    value={ageRange}
                    onChange={(newRange) => setAgeRange(newRange)}
                    pearling
                    minDistance={1}
                />
                <span>
                  {`Selected Age Range: ${ageRange[0]} - ${ageRange[1]}`}
                </span>
              </div>

              {/* Matches Played Slider */}
              <div className="filter-item">
                <label htmlFor="matchRange">Matches Played:</label>
                <ReactSlider
                    className="horizontal-slider"
                    thumbClassName="thumb"
                    trackClassName="track"
                    min={uniqueMatch[0] || 0} 
                    max={uniqueMatch[uniqueMatch.length - 1] || 100} 
                    value={matchRange}
                    onChange={(newMatchRange) => setMatchRange(newMatchRange)}
                    pearling
                    minDistance={1}
                />
                <span>
                  {`Selected Match Range: ${matchRange[0]} - ${matchRange[1]}`}
                </span>
              </div>

              {/* Minutes Played Slider */}
              <div className="filter-item">
                <label htmlFor="minuteRange">Minutes Played:</label>
                <ReactSlider
                    className="horizontal-slider"
                    thumbClassName="thumb"
                    trackClassName="track"
                    min={uniqueMinute[0] || 0} 
                    max={uniqueMinute[uniqueMinute.length - 1] || 100} 
                    value={minuteRange}
                    onChange={(newMinuteRange) => setMinuteRange(newMinuteRange)}
                    pearling
                    minDistance={1}
                />
                <span>
                  {`Selected Minutes Range: ${minuteRange[0]} - ${minuteRange[1]}`}
                </span>
              </div>
          </div>
        </div>
        <div className="right_div">
          <input type="file" onChange={(e) => setFile(e.target.files[0])} />
          <button onClick={uploadFile}>Upload</button>
          <button onClick={processFile}>Process</button>
          <button onClick={handleLogout}>Logout</button>
          <button 
            onClick={downloadPDF} 
            style={{
              margin: "10px", 
              padding: "10px", 
              background: "rgb(21, 83, 19)", 
              color: "white", 
              border: "none", 
              borderRadius: "5px", 
              cursor: "pointer"
            }}
          >
            Download
          </button>

          {message && <p>{message}</p>}

          {/* Weight Inputs */}
          <div className="weights-container">
            <h2>Adjust Weights</h2>
            <label>
              Attacking Weight:
              <input
                type="number"
                name="attacking_weight"
                value={weights.attacking_weight}
                onChange={handleWeightChange}
                step="0.01" // Increment or decrement by 0.01
                min="0"     // Minimum value
                max="1"     // Maximum value
              />
            </label>
            <label>
              Defensive Weight:
              <input
                type="number"
                name="defensive_weight"
                value={weights.defensive_weight}
                onChange={handleWeightChange}
                step="0.01" // Increment or decrement by 0.01
                min="0"
                max="1"
              />
            </label>
            <label>
              Build-Up Weight:
              <input
                type="number"
                name="passing_weight"
                value={weights.passing_weight}
                onChange={handleWeightChange}
                step="0.01"
                min="0"
                max="1"
              />
            </label>
            <label>
               Refinement Weight:
              <input
                type="number"
                name="dribbling_weight"
                value={weights.dribbling_weight}
                onChange={handleWeightChange}
                step="0.01"
                min="0"
                max="1"
              />
            </label>
            <p style={{ color: remainingWeight === 0 ? "green" : "red" }}>
              Remaining Weight: {remainingWeight.toFixed(2)} {remainingWeight === 0 ? "✓" : "✗"}
            </p>


          </div>

                {/* Search Bar */}
                <div className="search-container">
            <input
              type="text"
              placeholder="Search by Player Name OR Team Name"
              value={searchQuery}
              onChange={handleSearch}
              style={{
                width: "20%",
                padding: "10px",
                margin: "10px 0",
                fontSize: "16px",
              }}
            />
          </div>

          {/* Filter Inputs
          <div className="filters-container">
            <h2>Filters</h2>
            <label>
              Age:
              <input
                type="number"
                name="ageMin"
                placeholder="Min"
                onChange={handleFilterChange}
              />
              <input
                type="number"
                name="ageMax"
                placeholder="Max"
                onChange={handleFilterChange}
              />
            </label>
            <label>
              Foot:
              <select name="foot" onChange={handleFilterChange}>
                <option value="">All</option>
                <option value="Right">Right</option>
                <option value="Left">Left</option>
                <option value="Both">Both</option>
              </select>
            </label>
            <label>
              Height:
              <input
                type="number"
                name="heightMin"
                placeholder="Min (cm)"
                onChange={handleFilterChange}
              />
              <input
                type="number"
                name="heightMax"
                placeholder="Max (cm)"
                onChange={handleFilterChange}
              />
            </label>
            <label>
              Weight:
              <input
                type="number"
                name="weightMin"
                placeholder="Min (kg)"
                onChange={handleFilterChange}
              />
              <input
                type="number"
                name="weightMax"
                placeholder="Max (kg)"
                onChange={handleFilterChange}
              />
            </label>
            <label>
              Team Within Parameters:
              <select name="teamWithinParameters" onChange={handleFilterChange}>
                <option value="">All</option>
                <option value="Yes">Yes</option>
                <option value="No">No</option>
              </select>
            </label>
            <button onClick={filterResults}>Apply Filters</button>
          </div> */}
          
          
          {/* Results Table */}
          <div className="table-wrapper">
            <table>
            <thead>
              <tr>
                <th onClick={() => handleSort("Player Name")}>
                  Player Name {sortConfig.key === "Player Name" ? (sortConfig.direction === "asc" ? "↑" : "↓") : ""}
                </th>
                <th onClick={() => handleSort("Team Name")}>
                  Team Name {sortConfig.key === "Team Name" ? (sortConfig.direction === "asc" ? "↑" : "↓") : ""}
                </th>
                <th onClick={() => handleSort("Parent Posizione")}>
                  Parent Posizione {sortConfig.key === "Parent Posizione" ? (sortConfig.direction === "asc" ? "↑" : "↓") : ""}
                </th>
                <th onClick={() => handleSort("Posizione")}>
                  Posizione {sortConfig.key === "Posizione" ? (sortConfig.direction === "asc" ? "↑" : "↓") : ""}
                </th>
                <th onClick={() => handleSort("Age")}>
                  Age (Età) {sortConfig.key === "Age" ? (sortConfig.direction === "asc" ? "↑" : "↓") : ""}
                </th>
                <th onClick={() => handleSort("Height")}>
                  Height (Altezza) {sortConfig.key === "Height" ? (sortConfig.direction === "asc" ? "↑" : "↓") : ""}
                </th>
                <th onClick={() => handleSort("Weight")}>
                  Weight (Peso) {sortConfig.key === "Weight" ? (sortConfig.direction === "asc" ? "↑" : "↓") : ""}
                </th>
                <th onClick={() => handleSort("Country")}>
                  Country {sortConfig.key === "Country" ? (sortConfig.direction === "asc" ? "↑" : "↓") : ""}
                </th>
                <th onClick={() => handleSort("Partite disputate")}>
                  Matches Played {sortConfig.key === "Partite disputate" ? (sortConfig.direction === "asc" ? "↑" : "↓") : ""}
                </th>
                <th onClick={() => handleSort("Minuti giocati")}>
                  Minutes Played {sortConfig.key === "Minuti giocati" ? (sortConfig.direction === "asc" ? "↑" : "↓") : ""}
                </th>
                <th onClick={() => handleSort("Weighted Score")}>
                  Weighted Score {sortConfig.key === "Weighted Score" ? (sortConfig.direction === "asc" ? "↑" : "↓") : ""}
                </th>
                <th onClick={() => handleSort("Defensive Phase Index")}>
                  Defensive Phase Index {sortConfig.key === "Defensive Phase Index" ? (sortConfig.direction === "asc" ? "↑" : "↓") : ""}
                </th>
                <th onClick={() => handleSort("Build-Up Phase Index")}>
                  Build-Up Phase Index {sortConfig.key === "Build-Up Phase Index" ? (sortConfig.direction === "asc" ? "↑" : "↓") : ""}
                </th>
                <th onClick={() => handleSort("Refinement Phase Index")}>
                  Last Pass Index {sortConfig.key === "Refinement Phase Index" ? (sortConfig.direction === "asc" ? "↑" : "↓") : ""}
                </th>
                <th onClick={() => handleSort("Offensive Phase Index")}>
                  Offensive Phase Index {sortConfig.key === "Offensive Phase Index" ? (sortConfig.direction === "asc" ? "↑" : "↓") : ""}
                </th>
                <th onClick={() => handleSort("Goalkeeper Weighted Score")}>
                  Goalkeeper Weighted Score {sortConfig.key === "Goalkeeper Weighted Score" ? (sortConfig.direction === "asc" ? "↑" : "↓") : ""}
                </th>
                <th onClick={() => handleSort("Goal subiti")}>
                  Goals Conceded {sortConfig.key === "Goal subiti" ? (sortConfig.direction === "asc" ? "↑" : "↓") : ""}
                </th>
                <th onClick={() => handleSort("Tiri subiti")}>
                  Shots Conceded {sortConfig.key === "Tiri subiti" ? (sortConfig.direction === "asc" ? "↑" : "↓") : ""}
                </th>
                <th onClick={() => handleSort("Tiri subiti/90")}>
                  Shots Conceded Per 90 {sortConfig.key === "Tiri subiti/90" ? (sortConfig.direction === "asc" ? "↑" : "↓") : ""}
                </th>
                <th onClick={() => handleSort("Reti inviolate")}>
                  Clean Sheets {sortConfig.key === "Reti inviolate" ? (sortConfig.direction === "asc" ? "↑" : "↓") : ""}
                </th>
                <th onClick={() => handleSort("Parate, %")}>
                  Saves Percentage {sortConfig.key === "Parate, %" ? (sortConfig.direction === "asc" ? "↑" : "↓") : ""}
                </th>
                <th onClick={() => handleSort("xG concessi")}>
                  Expected Goals Conceded {sortConfig.key === "xG concessi" ? (sortConfig.direction === "asc" ? "↑" : "↓") : ""}
                </th>
                <th onClick={() => handleSort("xG concessi/90")}>
                  Expected Goals Conceded Per 90 {sortConfig.key === "xG concessi/90" ? (sortConfig.direction === "asc" ? "↑" : "↓") : ""}
                </th>
                <th onClick={() => handleSort("Goal evitati")}>
                  Goals Prevented {sortConfig.key === "Goal evitati" ? (sortConfig.direction === "asc" ? "↑" : "↓") : ""}
                </th>
                <th onClick={() => handleSort("Goal evitati/90")}>
                  Goals Prevented Per 90 {sortConfig.key === "Goal evitati/90" ? (sortConfig.direction === "asc" ? "↑" : "↓") : ""}
                </th>
                <th onClick={() => handleSort("Duelli aerei/90")}>
                  Aerial Duels Per 90 {sortConfig.key === "Duelli aerei/90" ? (sortConfig.direction === "asc" ? "↑" : "↓") : ""}
                </th>
                <th onClick={() => handleSort("Uscite/90")}>
                  Exits Per 90 {sortConfig.key === "Uscite/90" ? (sortConfig.direction === "asc" ? "↑" : "↓") : ""}
                </th>
              </tr>
            </thead>

              <tbody>
                {filteredResults.map((player, index) => ( // Confirm player exists
                  <React.Fragment key={index}>
                  {/* Player row */}
                  <tr>
                    <td
                      style={{ color: "rgb(21, 83, 19)", cursor: "pointer" }}
                      onClick={() => handlePlayerClick(player)}
                    >
                      {player["Player Name"] || "N/A"}
                    </td>
                    <td>{player["Team Name"] || "N/A"}</td>
                    <td>{player["Parent Posizione"] || "N/A"}</td>
                    <td>{player["Posizione"] || "N/A"}</td>
                    <td>{player["Age"] || "N/A"}</td>
                    <td>{player["Height"] || "N/A"}</td>
                    <td>{player["Weight"] || "N/A"}</td>
                    <td>{player["Country"] || "N/A"}</td>
                    <td>
                      {player["Partite disputate"] !== undefined
                        ? player["Partite disputate"]
                        : "N/A"}
                    </td>
                    <td>
                      {player["Minuti giocati"] !== undefined
                        ? player["Minuti giocati"]
                        : "N/A"}
                    </td>
                    <td>
                      {player["Weighted Score"] !== undefined
                        ? player["Weighted Score"].toFixed(2)
                        : "N/A"}
                    </td>
                    <td>
                      {player["Defensive Phase Index"] !== undefined
                        ? player["Defensive Phase Index"].toFixed(2)
                        : "N/A"}
                    </td>
                    <td>
                      {player["Build-Up Phase Index"] !== undefined
                        ? player["Build-Up Phase Index"].toFixed(2)
                        : "N/A"}
                    </td>
                    <td>
                      {player["Refinement Phase Index"] !== undefined
                        ? player["Refinement Phase Index"].toFixed(2)
                        : "N/A"}
                    </td>
                    <td>
                      {player["Offensive Phase Index"] !== undefined
                        ? player["Offensive Phase Index"].toFixed(2)
                        : "N/A"}
                    </td>
                    <td>
                      {player["Goalkeeper Weighted Score"] !== undefined
                        ? player["Goalkeeper Weighted Score"].toFixed(2)
                        : "N/A"}
                    </td>
                    <td>
                      {player["Goal subiti"] !== undefined
                        ? player["Goal subiti"].toFixed(2)
                        : "N/A"}
                    </td>
                    <td>
                      {player["Tiri subiti"] !== undefined
                        ? player["Tiri subiti"].toFixed(2)
                        : "N/A"}
                    </td>
                    <td>
                      {player["Tiri subiti/90"] !== undefined
                        ? player["Tiri subiti/90"].toFixed(2)
                        : "N/A"}
                    </td>
                    <td>
                      {player["Reti inviolate"] !== undefined
                        ? player["Reti inviolate"]
                        : "N/A"}
                    </td>
                    <td>
                      {player["Parate, %"] !== undefined
                        ? player["Parate, %"].toFixed(2) + "%"
                        : "N/A"}
                    </td>
                    <td>
                      {player["xG concessi"] !== undefined
                        ? player["xG concessi"].toFixed(2)
                        : "N/A"}
                    </td>
                    <td>
                      {player["xG concessi/90"] !== undefined
                        ? player["xG concessi/90"].toFixed(2)
                        : "N/A"}
                    </td>
                    <td>
                      {player["Goal evitati"] !== undefined
                        ? player["Goal evitati"].toFixed(2)
                        : "N/A"}
                    </td>
                    <td>
                      {player["Goal evitati/90"] !== undefined
                        ? player["Goal evitati/90"].toFixed(2)
                        : "N/A"}
                    </td>
                    <td>
                      {player["Duelli aerei/90"] !== undefined
                        ? player["Duelli aerei/90"].toFixed(2)
                        : "N/A"}
                    </td>
                    <td>
                      {player["Uscite/90"] !== undefined
                        ? player["Uscite/90"].toFixed(2)
                        : "N/A"}
                    </td>
                  </tr>           
                  {/* Radar chart row */}
                  {selectedPlayer && selectedPlayer.playerName === player["Player Name"] && (
                    <tr>
                      <td colSpan="21">
                        <div style={{ padding: "10px", backgroundColor: "#f9f9f9" }}>
                          <RadarChart playerData={selectedPlayer} />
                        </div>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
                
                ))}
              </tbody>
            </table>
          </div>
            {/* Radar Chart */}
            {/* {selectedPlayer && (
                <div>
                <h2>Radar Chart for {selectedPlayer.playerName}</h2>
                <RadarChart playerData={selectedPlayer} />
              </div>
              )} */}
      </div>
      </div>
    // </Router>
  );
}

export default App;
