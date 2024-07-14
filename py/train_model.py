from pymongo import MongoClient
# from dotenv import load_dotenv
import numpy as np
import pandas as pd
from pandas import json_normalize
import os
from unidecode import unidecode

from sklearn.preprocessing import LabelEncoder
from sklearn.ensemble import RandomForestClassifier
from sklearn.semi_supervised import SelfTrainingClassifier
from sklearn.feature_extraction.text import TfidfVectorizer, ENGLISH_STOP_WORDS
import joblib

database_client = MongoClient(os.getenv('MONGODB_URI'))
posts_collection = database_client['JVF']['posts']

posts_df = pd.DataFrame(json_normalize(list(posts_collection.find({ 'manual.category': {'$ne': None} }))))

print(posts_df)


#Need to keep track of tdif vectorizer allowed and not allowed terms

#Keep track of all parameters used when trained in metadata.json