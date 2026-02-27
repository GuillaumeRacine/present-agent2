🎯 Overview
A AI-powered gift assistant that learns and remembers all the important context on the users, mapping their relationships, occasion, recipient interests, budgets, etc. enabled by the world's best gift recommendation engine. Present Agent uses conversational AI - voice and text - to learn, remember all the user tells them, mapping out new info with each new interaction to further refine the recommendations. 

📊 Problem Validation
78% of people report gift-giving anxiety
$75B in unwanted gifts returned annually (US)
Average person spends 10+ hours annually searching for gifts
43% report gift disappointment damages relationships
Most people struggle at least partially with last minute gifts for recurring occasions (birthday, valentine's)

🔬 Core Product Assumptions To Research and Test For
- Can we use only graph DB to store all relevant data across primitives (users, occasions, relationships, product facets, etc) and provide recommendations that are more relevant and overall provides a much better approach to gift shopping than other alternatives - both online and offline? How can we A/b test our tech vs. say hybrid recommendation systems that use multiple techniques such as collaborative filtering, search history, similar or complementary products, etc. 
- Given that LLMs now can much better detect qualitatively a lot of the context humans don't share when clickin on things e.g. who the shopping is for, why and what are the mental filters you use to guide your search e.g. budget, past gift feedback, etc. 
- Can we chain multiple ML techniques, use subagents, and iterate workflows that could rethink how we can provide best personalized recommendations? How can we measure our approache's Desirability, VIABILITY, AND FEASIBILITY - to focus on the larger product and market risks? 
- What is the most intuitive way to map data using graph DB (neoj4 only?) and power various filtering or sorting techniques to deduce from the data, bottom-up, how to best design the recommendation engine? in other words, can we use deep learning and not be prescriptive in assigning product facets, or other similarly-user defined categories across any primitives?
- How can we best chain sub-agents to learn, analyse, organize and recommend products based on various considerations to provide 3 very relevant gift options over the course of a short conversation? 
- How can we best chain sub-agents with the coding workflow, starting from research into a GH issue card all the way to clean, world class code in production with ongoing maintenance. 
- Focus now on product milestones given that we want to solve for the best way to provide the most relevant gifts and can we provide a better way to power recommendations vs. what is out there today.
- Conversational UI collects better attributes and preferences. Users prefer a personal assistant that “knows them” and provides smart, succinct outputs with clear rationales. Be transparent on the process to get to the final recommendations and invite users to adjust, give more feedback, etc. to further improve their recommendations over time - collecting and mapping more and more data on them and other users, products, with time. 
- User AI to model out a wide range of user situations, personas, occasions, etc. to help provide structured and insightful data to further improve recommendation and user facing code. 


💡 Solution Approach
- Based on ALL data and various techniques to power recommendations, narrow down the product list universe to the 5 most relevant, best product ideas, within a certain level of confidence that is farly high. Then learn how to get to these few recommendations as efficiently and easily as possible - i.e. with the least amount of user input - but while still remaining highly relevant. 

-Relationship and user-context centered experience, using graph DB to map data points - that learns the complete dynamics for deciding on the best gift options. It maps all the data points and clusters them using graph DB, then it uses vector embeddings to power the overall recommendations, using subagents at each step and role to contribute towards the overall goal of the most relevant recommendations. 

-Emotional intelligence understanding the "why" behind gifts and the nuances of looking for a product for someone else, why products might be special, unique, and relevant for a given occation or person, etc. so that it feels like a genuinely personal, considered, one of a kind gift experience that makes the recipient feel seen and valued. 

- Network effect learning from all user outcomes using deep learning to learn unsupervised
- Generate own proprietary data from users, products, curations, etc. and measure product market fit clearly with specific recommendation and product market fit metrics - measured over time - e.g. with a data science sub agent? 
- Considers multiple facets that might not normally show up in what people sort or filter for, using semantics, search, to generate dimensions, or facets to their search that you wouldn't find in other places where the same users would go looking for  
e.g. Values-based matching (sustainable, local, handmade) - use vectors or dimensions that a typical recommendation engine wouldn't normally factor into the algoryth. Learn from user and recepient social media profiles for example.

📈 Business Model
Transaction-based (60%): commission on sales + premium delivery extras (and extra vip concierge deliveries)

🏗 Technical Architecture
-Neo4J Graph DB for all - users, sessions, transactions, conversation history, and any other relevant primitives in the data model(s). 
-Vectorized graph nodes, embeddings, etc. for powering the search and recommendations. 
-Cohere for re-ranking
Open to research other relevant, necessary tools for building a prototype and test our product assumptions. 


Front End
- Use Next.JS + vercel for the chat and voice user interfaces. 
- Logged in users only, so we can alwatys map back the user sessions and data to a unique ID. Use google oAuth only at first for testers.
- Create a work around for testing conversations in the front end without real people emails! so we can use a sub agent to test the user interactions and recommendations. 
- create an internal sub page /data to store and analyze all important product data: each test scores, overall product metrics over time, history or conversations, view personas and their context, etc. this will be used to decide how to further improve the product. 


Context & Memory (Updated)
- Rmember the user context and history from one session to the next. 
- The user should almost never have to repeat themselves if we remember and map the data properly. 
- Estabish a certain confidence level before proposing products, gain more information to increase relevance until you are fairly
- All inputs are natural language (voice or text); the assistant elicits and confirms minimal details (occasion, relationship, budgets, preferences/values) conversationally.

📏 Measurement Plan
- Metrics to measure for each user test: Overall recommendation relevance, learning rate, perceived relevance, rationale quality, time-to-first-confident-choice, intention to return, task success (saved/purchased), time/words to get to a relevant recommendation. 
- Learning Loop: capture feedback and outcomes iterate embeddings, graph features, and prompts to improve recommendation quality and efficiency. 
 - Memory Loop: quantify the lift from stored context, track share of sessions leveraging saved budgets or preferences, and measure reduction in clarifying turns. Also measure the memory and learning loop from one occasion to the next (e.g. next year, do we still remember and improve the recommendations?)

—

See also:
- Prototype scope, setup, and developer instructions: `README.md`
- Agent and LLM operating guidelines for this repo: `AGENTS.md`
