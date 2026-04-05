import sys
import json
import ast

def run_trace(code_str, start_line_offset=0):
    trace_data = []
    hidden_vars = {"__builtins__", "__name__", "__doc__", "__package__", "__loader__", "__spec__"}
    
    def trace_lines(frame, event, arg):
        if event != 'line':
            return trace_lines
        
        # We only care about code running from our injected string
        if frame.f_code.co_filename != "<string>":
            return trace_lines
            
        current_line = frame.f_lineno + start_line_offset
        
        local_vars = frame.f_locals
        filtered_vars = {}
        for k, v in local_vars.items():
            if k not in hidden_vars and not k.startswith('_'):
                # Ignore functions, classes, and modules from the trace
                if callable(v) or type(v).__name__ == 'module':
                    continue
                try:
                    filtered_vars[k] = repr(v)
                except Exception:
                    filtered_vars[k] = "<Unserializable>"
                    
        # Don't record empty initialization sweeps
        if len(filtered_vars) > 0 or len(trace_data) == 0:
            trace_data.append({
                "line": current_line,
                "variables": filtered_vars
            })
        
        return trace_lines

    sys.settrace(trace_lines)
    
    # We execute the code in an isolated dictionary 
    # to prevent it from polluting the tracer's global state
    sandbox_env = {}
    try:
        exec(code_str, sandbox_env, sandbox_env)
    except BaseException as e:
        trace_data.append({
            "line": "ERROR",
            "variables": {"Error": str(e)}
        })
    finally:
        sys.settrace(None)

    # In case the final line computation isn't captured by the line event before exit,
    # we force a final capture of the sandbox environment
    filtered_final = {}
    for k, v in sandbox_env.items():
        if k not in hidden_vars and not k.startswith('_'):
            try:
                filtered_final[k] = repr(v)
            except Exception:
                pass
    if len(filtered_final) > 0:
         trace_data.append({
            "line": "END",
            "variables": filtered_final
        })

    if getattr(args, 'output', None):
        with open(args.output, 'w', encoding='utf-8') as f:
            f.write(json.dumps(trace_data))
    else:
        print(json.dumps(trace_data))

if __name__ == "__main__":
    import argparse
    parser = argparse.ArgumentParser(description="Trace Python Code")
    parser.add_argument("code", help="The raw python code string to execute")
    parser.add_argument("--offset", type=int, default=0, help="Line offset for accurate reporting against original file")
    parser.add_argument("--output", type=str, default="", help="Optional file path to write JSON output directly")
    
    args = parser.parse_args()
    run_trace(args.code, args.offset)
