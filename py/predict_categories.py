from unidecode import unidecode
import joblib
import numpy as np
import os
from datetime import datetime

#Grab latest model

model_dir = max([datetime.strptime(date_string, "%m-%d-%y") for date_string in os.listdir('./py/models')]).strftime("%m-%d-%y")

model = joblib.load(f'./py/models/{model_dir}/model.joblib')
vectorizer = joblib.load(f'./py/models/{model_dir}/tf-idf_vectorizer.joblib')
label_encoder = joblib.load(f'./py/models/{model_dir}/label_encoder.joblib')

def predict_post_categories(texts_list):
    texts_list = [unidecode(text) for text in texts_list]
    X = vectorizer.transform(texts_list)

    y_pred_proba = model.predict_proba(X)

    results = [{
        'category': label_encoder.inverse_transform([np.argmax(probabilities)])[0],
        'probabilities': {category: prob for category, prob in zip(label_encoder.classes_, probabilities)}
    } for probabilities in y_pred_proba]

    return results