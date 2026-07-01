import streamlit as st

def show_project_header():

    st.info(
        f"""
**Project:** {st.session_state.project_name}

**Client:** {st.session_state.client}

**Prepared By:** {st.session_state.prepared_by}

**Revision:** {st.session_state.revision}
"""
    )