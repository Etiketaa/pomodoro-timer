import nltk
from nltk.stem import PorterStemmer
import json
import pickle
import numpy as np
from sklearn.feature_extraction.text import CountVectorizer
from sklearn.linear_model import LogisticRegression
import random

stemmer = PorterStemmer()

patterns = []
classes = []
documents = []
ignore_words = ['?', '!', '.', ',', "'s", "'m"]
train_data_file = open('intents.json').read()
intents = json.loads(train_data_file)

def get_stem_words(word_list, ignore_words):
    stem_words = []
    for word in word_list:
        if word not in ignore_words:
            w = stemmer.stem(word.lower())
            stem_words.append(w)
    return stem_words

for intent in intents['intents']:
    for pattern in intent['patterns']:
        patterns.append(pattern) # Collect raw patterns
        documents.append((pattern, intent['tag'])) # Store (raw pattern, tag)
    if intent['tag'] not in classes:
        classes.append(intent['tag'])

classes = sorted(list(set(classes)))

# Save classes
pickle.dump(classes, open('classes.pkl', 'wb'))

# Preprocess patterns
processed_patterns = []
for pattern in patterns:
    stemmed_words = get_stem_words(nltk.word_tokenize(pattern), ignore_words)
    processed_patterns.append(' '.join(stemmed_words))

# Initialize and fit CountVectorizer
vectorizer = CountVectorizer() # No tokenizer or preprocessor needed here
train_x = vectorizer.fit_transform(processed_patterns).toarray()

# Save the vectorizer
pickle.dump(vectorizer, open('vectorizer.pkl', 'wb'))

# Create training data for labels
train_y = []
for document in documents:
    output_row = [0] * len(classes)
    output_row[classes.index(document[1])] = 1
    train_y.append(output_row)

train_y = np.array(train_y)

# Train a simple scikit-learn classifier
classifier = LogisticRegression(random_state=0, solver='liblinear')
classifier.fit(train_x, np.argmax(train_y, axis=1)) # Use argmax here

# Save the classifier
pickle.dump(classifier, open('chatbot_classifier.pkl', 'wb'))

print("Training complete and model saved as chatbot_classifier.pkl and vectorizer.pkl")