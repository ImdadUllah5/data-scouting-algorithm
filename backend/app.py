import os
from flask import Flask, request, jsonify, session, send_from_directory
from flask import Flask, request, jsonify
from flask_session import Session 
from flask import Flask, request, jsonify, session
import pandas as pd
from flask_cors import CORS
from sklearn.cluster import KMeans
from sklearn.preprocessing import StandardScaler
from sklearn.preprocessing import MinMaxScaler
from werkzeug.security import check_password_hash, generate_password_hash

app = Flask(__name__, static_folder='frontend/build', static_url_path='')


CORS(app)

# Dummy user data (replace with your database in production)
users = {
    "test": generate_password_hash("123")
}

# Secret key for session management
app.secret_key = 'your_secret_key'

# Configure session
app.config['SESSION_TYPE'] = 'filesystem'  # Store sessions in the file system
app.config['SESSION_PERMANENT'] = False
app.config['SESSION_USE_SIGNER'] = True

# Initialize Flask-Session
Session(app)

# Login route
@app.route('/login', methods=['POST'])
def login():
    data = request.json
    username = data.get('username')
    password = data.get('password')

    if username in users and check_password_hash(users[username], password):
        session['user'] = username  # Save user session
        return jsonify({"message": "Login successful!"}), 200
    else:
        return jsonify({"error": "Invalid username or password"}), 401

# Logout route
@app.route('/logout', methods=['POST'])
def logout():
    session.pop('user', None)  # Clear session
    return jsonify({"message": "Logged out successfully!"}), 200



# Serve React frontend
@app.route('/')
@app.route('/<path:path>')
def serve_frontend(path=''):
    if path != "" and os.path.exists(app.static_folder + '/' + path):
        return send_from_directory(app.static_folder, path)
    else:
        return send_from_directory(app.static_folder, 'index.html')
    






# Route to upload the file
@app.route('/upload', methods=['POST'])
def upload_file():
    file = request.files['file']
    try:
        data = pd.read_excel(file)

        # Save the uploaded data to a temporary CSV
        data.to_csv('uploaded_data.csv', index=False)

        return jsonify({"message": "File uploaded successfully!"})
    except Exception as e:
        print(f"Error uploading file: {e}")
        return jsonify({"error": "An error occurred while uploading the file"}), 500

# Route to process the uploaded data
@app.route('/process', methods=['POST'])
def process_file():
    try:
        
        # Load the saved CSV file
        data = pd.read_csv('uploaded_data.csv')

        # Convert specific columns to numeric, coercing errors to NaN
        columns_to_convert = ['Età', 'Altezza', 'Peso']
        for column in columns_to_convert:
            data[column] = pd.to_numeric(data[column], errors='coerce')

        # Convert 'Scadenza contratto' to datetime and extract the year
        data['Scadenza contratto'] = pd.to_datetime(data['Scadenza contratto'], errors='coerce')
        data['Year'] = data['Scadenza contratto'].dt.year
        data['Year'] = data['Year'].fillna(0).astype(int)

        # Parse weights from request
        weights = request.json or {}
        attacking_weight = weights.get('attacking_weight', 1)
        defensive_weight = weights.get('defensive_weight', 1)
        passing_weight = weights.get('passing_weight', 1)
        dribbling_weight = weights.get('dribbling_weight', 1)

        # Required columns for processing
        required_columns = [
            'Giocatore', 'Squadra', 'Età', 'Piede', 'Altezza', 'Peso', 
            'Squadra entro i parametri stabiliti', 'Paese di nascita', 'Scadenza contratto',
            "Azione difensive riuscite/90", "Duelli difensivi/90", "Tiri intercettati/90", 
            "Duelli difensivi vinti, %", "Duelli aerei/90", "Duelli aerei vinti, %",
            "Azioni offensive riuscite/90", "Goal/90", "Tiri/90", "Tocchi in area/90", 
            "Passaggi chiave/90", 
            'Passaggi in avanti/90', 'Precisione passaggi in avanti, %', 
            'Passaggi corti / medi /90', 'Precisione passaggi corti / medi, %', 
            'Passaggi lunghi/90', 'Precisione lanci lunghi, %', 
            "Dribbling/90", "Dribbling riusciti, %", "Contrasti/90", 
            "Possesso riconquistato dopo tackle scivolato", "Posizione", "Partite disputate", "Minuti giocati", "xG concessi/90"
        ]


        # Add Raw Data for Radar Chart
        data['rawMetrics'] = data.apply(lambda row: {
            "defensiveMetrics": {
                "successfulDefensiveActions": row["Azione difensive riuscite/90"],
                "defensiveDuels": row["Duelli difensivi/90"],
                "defensiveDuelsWon": row["Duelli difensivi vinti, %"],
                "aerialDuels": row["Duelli aerei/90"],
                "aerialDuelsWon": row["Duelli aerei vinti, %"],
                "interceptedShots": row["Tiri intercettati/90"],
            },
            "buildUpMetrics": {
                "forwardPasses": row["Passaggi in avanti/90"],
                "forwardPassAccuracy": row["Precisione passaggi in avanti, %"],
                "shortMediumPasses": row["Passaggi corti / medi /90"],
                "shortMediumPassAccuracy": row["Precisione passaggi corti / medi, %"],
                "longPasses": row["Passaggi lunghi/90"],
                "longPassAccuracy": row["Precisione lanci lunghi, %"],
            },
            "offensiveMetrics": {
                "successfulOffensiveActions": row["Azioni offensive riuscite/90"],
                "goals": row["Goal/90"],
                "touchesInArea": row["Tocchi in area/90"],
                "keyPasses": row["Passaggi chiave/90"],
                "shots": row["Tiri/90"],
            }
        }, axis=1)

                 





        if not all(col in data.columns for col in required_columns):
            missing_columns = [col for col in required_columns if col not in data.columns]
            return jsonify({"error": f"Missing columns: {', '.join(missing_columns)}"}), 400


        # Store original values before applying transformations
        data['Original Avg Success Actions'] = data[[
            "Azione difensive riuscite/90", "Duelli difensivi/90",
            "Duelli difensivi vinti, %", "Duelli aerei/90", "Duelli aerei vinti, %", "Tiri intercettati/90"
        ]].mean(axis=1)

        data['Original Attacking Efficiency'] = (
            data["Azioni offensive riuscite/90"] * 0.3 +
            data["Goal/90"] * 0.3 +
            data["Passaggi chiave/90"] * 0.2 +
            data["Tiri/90"] * 0.1 +
            data["Tocchi in area/90"] * 0.1
        )

        data['Original Build-Up Efficiency'] = (
            data["Passaggi in avanti/90"] * 0.3 +
            data["Precisione passaggi in avanti, %"] * 0.3 +
            data["Passaggi corti / medi /90"] * 0.2 +
            data["Passaggi lunghi/90"] * 0.2
        )



        # Mapping of subcategories to parent categories
        position_mapping = {
        'CB': 'Central Defender', 'RCB': 'Central Defender', 'LCB': 'Central Defender',
        'CF': 'Forward', 'LW': 'Winger', 'RW': 'Winger',
        'LCMF': 'Midfielder', 'RCMF': 'Midfielder', 'AMF': 'Attacking Midfielder',
        'DMF': 'Defensive Midfielder', 'GK': 'Goalkeeper',
        'LB': 'Full Back', 'RB': 'Full Back', 'RWB': 'Wing Back', 'LWB': 'Wing Back',
        'RAMF': 'Attacking Midfielder', 'LWF': 'Winger', 'LDMF': 'Defensive Midfielder',
        'RWF': 'Winger', 'LAMF': 'Attacking Midfielder', 'RDMF': 'Defensive Midfielder',
        }


        # Helper function to categorize based on mapping
        def categorize_position(pos):
            # Split multiple positions and pick the first one
            first_position = pos.split(',')[0].strip()
            # Map to parent category or keep original if not in mapping
            return position_mapping.get(first_position, first_position)

        # Apply the mapping to the "Posizione" column
        data['Parent Posizione'] = data['Posizione'].apply(categorize_position)




        data['Avg Success Actions'] = (
            data.groupby('Parent Posizione')[[
                "Azione difensive riuscite/90", "Duelli difensivi/90", 
                "Duelli difensivi vinti, %", "Duelli aerei/90", 
                "Duelli aerei vinti, %", "Tiri intercettati/90"
            ]]
            .apply(lambda group: group.mean(axis=1))
            .reset_index(level=0, drop=True)  # Align results with original DataFrame
        )





        # data['Avg Success Actions Std'] = data.groupby('Parent Posizione')[[
        #     "Azione difensive riuscite/90", "Duelli difensivi/90",
        #     "Duelli difensivi vinti, %", "Duelli aerei/90", "Duelli aerei vinti, %", "Tiri intercettati/90"
        # ]].transform('std')


        data['Attacking Efficiency'] = (
            data.groupby('Parent Posizione')
            [["Azioni offensive riuscite/90", "Goal/90", "Passaggi chiave/90", "Tiri/90", "Tocchi in area/90"]]
            .apply(lambda group: group["Azioni offensive riuscite/90"] * 0.3 +
                                group["Goal/90"] * 0.3 +
                                group["Passaggi chiave/90"] * 0.2 +
                                group["Tiri/90"] * 0.1 +
                                group["Tocchi in area/90"] * 0.1)
            .reset_index(level=0, drop=True)  # Align results with original DataFrame
        )




        # Add Build-Up Phase Metrics
        data['Build-Up Efficiency'] = (
            data.groupby('Parent Posizione')
            [["Passaggi in avanti/90", "Precisione passaggi in avanti, %", 
            "Passaggi corti / medi /90", "Passaggi lunghi/90"]]
            .apply(lambda group: group["Passaggi in avanti/90"] * 0.3 +
                                group["Precisione passaggi in avanti, %"] * 0.3 +
                                group["Passaggi corti / medi /90"] * 0.2 +
                                group["Passaggi lunghi/90"] * 0.2)
            .reset_index(level=0, drop=True)  # Align results with original DataFrame
        )





        # Passing Metrics Calculations - Keep row-specific values
        data['Forward Passing Accuracy'] = data['Precisione passaggi in avanti, %']
        data['Short/Medium Passing Accuracy'] = data['Precisione passaggi corti / medi, %']
        data['Long Passing Accuracy'] = data['Precisione lanci lunghi, %']

        # Dribbling Metrics - Keep row-specific values
        data['Dribbling Success Rate'] = data['Dribbling riusciti, %'] / 100

        # Tackling Efficiency - Row-specific calculation
        data['Tackling Efficiency'] = (
            data["Contrasti/90"] + data["Possesso riconquistato dopo tackle scivolato"]
        )





        # Normalize key columns to 0-1 range
        scaler = MinMaxScaler()
        data['Avg Success Actions'] = scaler.fit_transform(data[['Avg Success Actions']])
        data['Forward Passing Accuracy'] = scaler.fit_transform(data[['Forward Passing Accuracy']])
        data['Attacking Efficiency'] = scaler.fit_transform(data[['Attacking Efficiency']])

        



        # Clustering Players
        # clustering_features = ['Weighted Score']
        # scaler = StandardScaler()
        # scaled_features = scaler.fit_transform(data[clustering_features])

        # kmeans = KMeans(n_clusters=3, random_state=42)
        # data['Cluster'] = kmeans.fit_predict(scaled_features)

        # # Extract cluster centroids
        # cluster_centroids = kmeans.cluster_centers_

        # # Map clusters to meaningful labels based on centroids
        # cluster_labels = {}
        # for i, centroid in enumerate(cluster_centroids):
        #     if centroid[0] > 0.5:  # High positive centroid
        #         cluster_labels[i] = "Goal-Focused Striker"
        #     elif -0.5 <= centroid[0] <= 0.5:  # Around neutral/zero
        #         cluster_labels[i] = "Playmaker Midfielder"
        #     else:  # Low negative centroid
        #         cluster_labels[i] = "Defensive Specialist"

        # # Replace cluster numbers with descriptive labels
        # data['Cluster'] = data['Cluster'].map(cluster_labels)









        # Get unique parent categories for debugging
        unique_parent_positions = data['Parent Posizione'].unique()

        # Add subcategories dynamically based on metrics
        def assign_subcategory(row):
            # Initialize scores for subcategories
            marker_score = row["Duelli difensivi vinti, %"] + row["Tiri intercettati/90"]
            build_up_score = row["Passaggi in avanti/90"] + row["Precisione passaggi in avanti, %"]
            offensive_score = row["Tocchi in area/90"] + row["Goal/90"]
            
            # Determine the highest score
            if marker_score >= build_up_score and marker_score >= offensive_score:
                return "Marker"
            elif build_up_score >= marker_score and build_up_score >= offensive_score:
                return "Build-Up Initiator"
            else:
                return "Offensive Contributor"

        # Apply the function to assign subcategories
        data["Subcategory"] = data.apply(assign_subcategory, axis=1)

        
        # Extract and separate combined 'Posizione' values
        all_positions = data['Posizione'].dropna().tolist()
        unique_individual_positions = set()
        combined_positions = []

        for position in all_positions:
            separated_positions = [p.strip() for p in position.split(',')]
            
            if len(separated_positions) > 1:  # If it is a combined position
                combined_positions.append(position)  # Add the original combined value
            
            unique_individual_positions.update(separated_positions)  # Add individual positions

        # Convert the sets to sorted lists
        unique_individual_positions_list = sorted(unique_individual_positions)
        combined_positions_list = sorted(set(combined_positions))

        data['combined_positions_list'] = [combined_positions_list] * len(data)

        # Rename columns for frontend compatibility
        data.rename(columns={
            'Giocatore': 'Player Name',
            'Squadra': 'Team Name',
            'Età': 'Age',
            'Piede': 'Foot',
            'Altezza': 'Height',
            'Peso': 'Weight',
            'Squadra entro i parametri stabiliti': 'Team Within Parameters',
            'Paese di nascita': 'Country'
        }, inplace=True)


                # Metrics to calculate min and max values for
        metrics_to_calculate = ['Avg Success Actions', 'Build-Up Efficiency', 'Attacking Efficiency']

        # Calculate min and max for each metric across Parent Posizione and add rounded values to the dataset
        for metric in metrics_to_calculate:
            min_col = f"{metric} Min"  # Column for minimum values
            max_col = f"{metric} Max"  # Column for maximum values
            data[min_col] = data.groupby('Parent Posizione')[metric].transform('min').round(2)
            data[max_col] = data.groupby('Parent Posizione')[metric].transform('max').round(2)




        # Add Goalkeeper Metrics
        goalkeeper_metrics = [
            "Goal subiti", "Goal subiti/90", "Tiri subiti", "Tiri subiti/90",
            "Reti inviolate", "Parate, %", "xG concessi", "xG concessi/90",
            "Goal evitati", "Goal evitati/90", "Retropassaggi ricevuti dal portiere/90", "Uscite/90"
        ]

        # Fill NaNs with 0 for goalkeeper-specific metrics
        for metric in goalkeeper_metrics:
            if metric in data.columns:
                data[metric] = data[metric].fillna(0)

        # Add Weighted Score for Goalkeepers
        data['Goalkeeper Weighted Score'] = 0.0
        data.loc[data['Posizione'] == 'GK', 'Goalkeeper Weighted Score'] = (
            data["Goal evitati/90"] * 0.3 +
            data["Parate, %"] * 0.2 +
            data["Reti inviolate"] * 0.2 +
            data["Tiri subiti/90"] * 0.1 +
            data["Goal subiti/90"] * -0.1 +
            data["xG concessi/90"] * -0.1 +
            data["Uscite/90"] * 0.1
        )



        # Group parameters by phase
        metrics_by_phase = {
                'defensive': [
                "Azione difensive riuscite/90", "Duelli difensivi/90", "Duelli difensivi vinti, %",
                "Duelli aerei/90", "Duelli aerei vinti, %", "Contrasti/90",
                "Possesso riconquistato dopo tackle scivolato", "Tiri intercettati/90",
                "Palle intercettate/90", "Possesso riconquistato dopo intercetto",
                "Falli/90", "Cartellini gialli", "Cartellini gialli/90", 
                "Cartellini rossi", "Cartellini rossi/90"
            ],
            'offensive': [
                "Azioni offensive riuscite/90", "Goal", "Goal/90", "Goal (esclusi rigori)",
                "Goal esclusi rigori/90", "xG", "xG/90", "Goal di testa",
                "Goal di testa/90", "Tiri", "Tiri/90", "Tiri in porta, %",
                "Realizzazione, %", "Assist", "Assist/90", "Cross/90", 
                "Precisione cross, %", "Cross dalla fascia sinistra/90",
                "Cross precisi da sinistra, %", "Cross dalla fascia destra/90",
                "Cross precisi da destra, %", "Cross verso l'area piccola/90",
                "Dribbling/90", "Dribbling riusciti, %", "Duelli offensivi/90",
                "Duelli offensivi vinti, %", "Tocchi in area/90", "Allunghi/90",
                "Accelerazioni/90", "Passaggi ricevuti/90", "Lanci lunghi ricevuti/90",
                "Falli subiti/90"
            ],
            'build_up': [
                "Passaggi/90", "Precisione passaggi, %", "Passaggi in avanti/90",
                "Precisione passaggi in avanti, %", "Retropassaggi/90", 
                "Precisione retropassaggi, %", "Passaggi laterali/90", 
                "Precisione passaggi laterali, %", "Passaggi corti / medi /90",
                "Precisione passaggi corti / medi, %", "Passaggi lunghi/90",
                "Precisione lanci lunghi, %", "Lunghezza media passaggi, m",
                "Lunghezza media passaggi lunghi, m"
            ],
            'refinement': [
                "Assist", "Assist/90", "xA", "xA/90", "Second assist/90",
                "Third assist/90", "Passaggi smarcanti/90", "Precisione passaggi smarcanti, %",
                "Passaggi chiave/90", "Passaggi nella trequarti/90",
                "Precisione passaggi verso la trequarti, %", "Passaggi verso l'area di rigore/90",
                "Precisione passaggi verso l'area di rigore, %", "Passaggi filtranti/90",
                "Precisione passaggi filtranti, %", "Attacco in profondità/90",
                "Cross dalla trequarti/90", "Passaggi progressivi/90",
                "Precisione passaggi progressivi, %"
            ]
        }

        # Calculate z-scores for each parameter within phases
        # Calculate z-scores for each parameter within phases in an optimized way
        for phase, metrics in metrics_by_phase.items():
            metrics_to_add = {}

            # Prepare all necessary transformations
            for metric in metrics:
                if metric in data.columns:
                    std_series = data.groupby('Parent Posizione')[metric].transform('std')
                    mean_series = data.groupby('Parent Posizione')[metric].transform('mean')
                    z_score_series = (data[metric] - mean_series) / std_series

                    metrics_to_add[f'{metric} Std'] = std_series
                    metrics_to_add[f'{metric} Z-Score'] = z_score_series

            # Append all calculated columns in bulk to the DataFrame
            if metrics_to_add:  # Only update if there are metrics to add
                new_metrics_df = pd.DataFrame(metrics_to_add)
                data = pd.concat([data, new_metrics_df], axis=1)


        # Calculate phase indices
        data['Defensive Phase Index'] = data[[ 
            f"{metric} Z-Score" for metric in metrics_by_phase['defensive'] if f"{metric} Z-Score" in data.columns
        ]].mean(axis=1)

        data['Offensive Phase Index'] = data[[ 
            f"{metric} Z-Score" for metric in metrics_by_phase['offensive'] if f"{metric} Z-Score" in data.columns
        ]].mean(axis=1)

        data['Build-Up Phase Index'] = data[[ 
            f"{metric} Z-Score" for metric in metrics_by_phase['build_up'] if f"{metric} Z-Score" in data.columns
        ]].mean(axis=1)

        data['Refinement Phase Index'] = data[[ 
            f"{metric} Z-Score" for metric in metrics_by_phase['refinement'] if f"{metric} Z-Score" in data.columns
        ]].mean(axis=1)


        # Weighted Score Calculation
        data['Weighted Score'] = (
            attacking_weight * data['Offensive Phase Index'] +
            defensive_weight * data['Defensive Phase Index'] +
            passing_weight * data['Build-Up Phase Index'] +
            dribbling_weight * data['Refinement Phase Index']
        )
        
        # Calculate final score as a weighted average of phase indices
        # data['Final Score'] = (
        #     data['Defensive Phase Index'] * 0.25 + 
        #     data['Offensive Phase Index'] * 0.35 + 
        #     data['Build-Up Phase Index'] * 0.25 + 
        #     data['Refinement Phase Index'] * 0.15
        # )

        # Standardizing relevant columns for z-scores
        standardize_columns = [
            'Avg Success Actions', 'Attacking Efficiency', 'Build-Up Efficiency', 
            'Forward Passing Accuracy', 'Short/Medium Passing Accuracy', 'Long Passing Accuracy',
            'Dribbling Success Rate', 'Tackling Efficiency', 'Weighted Score',             
            "Tiri subiti/90", 
            "Tiri subiti",
            "Goal evitati", 
            "Uscite/90", 
            "xG concessi", 
            "xG concessi/90",
            "Goal subiti",
            "Goalkeeper Weighted Score"
        ]

        for col in standardize_columns:
            data[f'{col} Z-Score'] = data.groupby('Parent Posizione')[col].transform(
                lambda x: (x - x.mean()) / x.std()
            )

        data['Goalkeeper Weighted Score Z-Score'] = data['Goalkeeper Weighted Score Z-Score'].astype(float).round(2)
        data['Goal subiti Z-Score'] = data['Goal subiti Z-Score'].astype(float).round(2)
        data['Tiri subiti Z-Score'] = data['Tiri subiti Z-Score'].astype(float).round(2)


        data['xG concessi/90 Z-Score'] = data['xG concessi/90 Z-Score'].fillna(0)
        data["xG concessi Z-Score"] = data["xG concessi Z-Score"].fillna(0)
        

        # Identify all columns ending with 'Z-Score'
        z_score_columns = [col for col in data.columns if col.endswith('Z-Score')]
        
        
        data = data.fillna(0)


        import numpy as np


        def calculate_percentiles(data, group_col, metrics):
            """
            Calculate percentiles for metrics grouped by a column in a more efficient way.
            """
            new_columns = {}
            
            for metric in metrics:
                if metric in data.columns:
                    # Calculate percentiles for the current metric
                    percentiles = data.groupby(group_col)[metric].transform(
                        lambda x: round((x.rank(method='min') - 1) / (len(x) - 1) * 100, 0)
                    )
                    # Store the result in the new_columns dictionary
                    new_columns[f'{metric} Percentile'] = percentiles
                else:
                    print(f"Metric {metric} is missing in the DataFrame.")
            
            # Add all new columns to the original DataFrame in one go
            data = pd.concat([data, pd.DataFrame(new_columns, index=data.index)], axis=1)
            return data


        # Extract metrics from metrics_by_phase for the bar chart
        metrics_to_calculate = (
            metrics_by_phase['defensive'] +
            metrics_by_phase['offensive'] +
            metrics_by_phase['build_up'] +
            metrics_by_phase['refinement']
        )

        # Calculate percentiles for the selected metrics
        data = calculate_percentiles(data, group_col="Parent Posizione", metrics=metrics_to_calculate)

        # Assuming 'data' is your DataFrame
        num_columns = len(data.columns)
        print(f"Number of columns in the dataset: {num_columns}")
                # Drop duplicate columns if they exist
        data = data.loc[:, ~data.columns.duplicated()]


        # Convert DataFrame to a list of dictionaries for easier processing in Python
        # final_data = data[[  
        #     'Player Name', 'Team Name', 'Posizione', 'Age', 'Height', 'Weight', 'Forward Passing Accuracy',
        #     'Short/Medium Passing Accuracy', 'Long Passing Accuracy', 'Team Within Parameters', 'Country', 
        #     'Year', 'Parent Posizione', 'Subcategory',
        #     'Avg Success Actions', "Azione difensive riuscite/90", "Duelli difensivi/90", 
        #     "Duelli difensivi vinti, %", "Duelli aerei/90", "Duelli aerei vinti, %", "Tiri intercettati/90",
        #     'Attacking Efficiency', "Azioni offensive riuscite/90", "Goal/90", "Tocchi in area/90", 
        #     "Passaggi chiave/90", "Tiri/90", 'Build-Up Efficiency', "Passaggi in avanti/90", 
        #     "Precisione passaggi in avanti, %", "Passaggi corti / medi /90", "Precisione passaggi corti / medi, %",
        #     "Passaggi lunghi/90", "Precisione lanci lunghi, %", 'Dribbling Success Rate', 
        #     "Dribbling/90", "Dribbling riusciti, %", 'Tackling Efficiency', "Contrasti/90", 
        #     "Possesso riconquistato dopo tackle scivolato", 'Weighted Score', 'combined_positions_list', 'Avg Success Actions Min', 'Avg Success Actions Max',
        #     'Build-Up Efficiency Min', 'Build-Up Efficiency Max',
        #     'Attacking Efficiency Min', 'Attacking Efficiency Max', 'Partite disputate', 'Minuti giocati', 'Goal subiti Z-Score', 'Parate, %', 'xG concessi', 'Reti inviolate', 
        #     'Goal evitati', 'Goal evitati/90', 'Duelli aerei/90', 'Uscite/90', 'Goalkeeper Weighted Score', 'xG concessi/90', 'Tiri subiti Z-Score', 'Tiri subiti/90 Z-Score', 
        #     'Defensive Phase Index', 'Offensive Phase Index', 'Build-Up Phase Index', 'Refinement Phase Index', 'xG concessi/90 Z-Score', 
        #     'xG concessi Z-Score', 'Goalkeeper Weighted Score Z-Score'
        # ]].to_dict(orient='records')  # Convert DataFrame to a list of dictionaries

        # Convert the entire DataFrame to a list of dictionaries
        final_data = data.to_dict(orient='records')
        
        # Include Goalkeeper Metrics in Final Output
        for player in final_data:
            if player['Posizione'] == 'GK':
                player["goalkeeperMetrics"] = {
                    "goalsConceded": player.get("Goal subiti Z-Score", 0),
                    "goalsConcededPer90": player.get("Goal subiti/90", 0),
                    "shotsConceded": player.get("Tiri subiti Z-Score", 0),
                    "shotsConcededPer90": player.get("Tiri subiti/90 Z-Score", 0),
                    "cleanSheets": player.get("Reti inviolate", 0),
                    "savesPercentage": player.get("Parate, %", 0),
                    "expectedGoalsConceded": player.get("xG concessi", 0),
                    "expectedGoalsConcededPer90": player.get("xG concessi/90", 0),
                    "goalsPrevented": player.get("Goal evitati", 0),
                    "goalsPreventedPer90": player.get("Goal evitati/90", 0),
                    "aerialDuelsPer90": player.get("Duelli aerei/90", 0),
                    "exitsPer90": player.get("Uscite/90", 0),
                    "generalIndex": player.get("Goalkeeper Weighted Score Z-Score", 0),
                }

        # Defensive Metrics
        for player in final_data:
            player["defensiveMetrics"] = {
                "avgSuccessActions": player.get("Original Avg Success Actions", 0),
                "successfulDefensiveActions": player.get("Azione difensive riuscite/90", 0),
                "defensiveDuels": player.get("Duelli difensivi/90", 0),
                "defensiveDuelsWon": player.get("Duelli difensivi vinti, %", 0),
                "aerialDuels": player.get("Duelli aerei/90", 0),
                "aerialDuelsWon": player.get("Duelli aerei vinti, %", 0),
                "interceptedShots": player.get("Tiri intercettati/90", 0),
            }

        # Build-Up Metrics
        for player in final_data:
            player["buildUpMetrics"] = {
                "efficiency": player.get("Original Build-Up Efficiency", 0),
                "forwardPasses": player.get("Passaggi in avanti/90", 0),
                "forwardPassAccuracy": player.get("Precisione passaggi in avanti, %", 0),
                "shortMediumPasses": player.get("Passaggi corti / medi /90", 0),
                "shortMediumPassAccuracy": player.get("Precisione passaggi corti / medi, %", 0),
                "longPasses": player.get("Passaggi lunghi/90", 0),
                "longPassAccuracy": player.get("Precisione lanci lunghi, %", 0),
            }

        # Offensive Metrics
        for player in final_data:
            player["offensiveMetrics"] = {
                "efficiency": player.get("Original Attacking Efficiency", 0),
                "successfulOffensiveActions": player.get("Azioni offensive riuscite/90", 0),
                "goals": player.get("Goal/90", 0),
                "touchesInArea": player.get("Tocchi in area/90", 0),
                "keyPasses": player.get("Passaggi chiave/90", 0),
                "shots": player.get("Tiri/90", 0),
            }


        duplicate_columns = data.columns[data.columns.duplicated()].tolist()

        print(f"Duplicate columns: {duplicate_columns}")

        #print("Columns in DataFrame:", data.columns.tolist())

        # Return JSON response
        return jsonify(final_data)  # final_data is now a list of dictionaries
    except Exception as e:
        print(f"Error processing file: {e}")
        return jsonify({"error": "An error occurred while processing the file"}), 500

if __name__ == '__main__':
    app.run(debug=True)