
from remotion_lambda import RenderParams, RenderProgressParams
from remotion_lambda import RemotionClient
import os
from dotenv import load_dotenv


load_dotenv()

# Load env variables
REMOTION_APP_REGION = os.getenv('REMOTION_APP_REGION')
REMOTION_APP_BUCKET = os.getenv('REMOTION_APP_BUCKET')
REMOTION_APP_FUNCTION_NAME = os.getenv('REMOTION_APP_FUNCTION_NAME')
REMOTION_APP_SERVE_URL = os.getenv('REMOTION_APP_SERVE_URL')


# Construct client
client = RemotionClient(region=REMOTION_APP_REGION,
                        serve_url=REMOTION_APP_SERVE_URL,
                        function_name=REMOTION_APP_FUNCTION_NAME)

# Set render request
render_params = RenderParams(
    composition="main",
    data={
        'hi': 'there'
    },
)

print("\n")
render_response = client.render_media_on_lambda(render_params)
if render_response:
    # Execute render request

    print(render_response.renderId)
    print(render_response.bucketName)

    print("\n")

    # Execute progress request
    progress_response = client.get_render_progress(
        render_id=render_response.renderId, bucket_name=render_response.bucketName)
    if progress_response:
        print("Overall progress")
        print(progress_response.overallProgress)
print("\n")
