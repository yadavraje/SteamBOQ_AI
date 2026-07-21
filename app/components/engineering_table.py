import pandas as pd
import streamlit as st


def engineering_table(data):

   df = pd.DataFrame(data)
   st.dataframe(df, use_container_width=True, hide_index=True
    )