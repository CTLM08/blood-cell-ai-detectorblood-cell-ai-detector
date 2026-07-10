"""
Export the latest training checkpoint to a SavedModel.
Run after training: python -m model.export
Exported model saved to model/exported_model/
"""
import subprocess
import sys
import os
from model.config import TRAINING_DIR, EXPORTED_DIR, PIPELINE_CONFIG

EXPORT_SCRIPT = os.path.join(
    os.path.dirname(os.path.dirname(os.path.abspath(__file__))),
    "tf_models", "research", "object_detection", "exporter_main_v2.py"
)

def export():
    os.makedirs(EXPORTED_DIR, exist_ok=True)
    cmd = [
        sys.executable, EXPORT_SCRIPT,
        "--input_type=image_tensor",
        f"--pipeline_config_path={PIPELINE_CONFIG}",
        f"--trained_checkpoint_dir={TRAINING_DIR}",
        f"--output_directory={EXPORTED_DIR}",
    ]
    print("Exporting model...")
    subprocess.run(cmd, check=True)
    print(f"Model exported to: {EXPORTED_DIR}")

if __name__ == "__main__":
    export()
